import pool from '../lib/db';

async function applyProxyEngine() {
  const client = await pool.connect();
  try {
    console.log('1. Checking and updating PROXY_BIDS table columns & constraints...');
    
    // Add max_bid_amount column if missing
    await client.query(`
      ALTER TABLE PROXY_BIDS ADD COLUMN IF NOT EXISTS max_bid_amount NUMERIC(12, 2);
    `);
    
    // Sync existing max_limit to max_bid_amount
    await client.query(`
      UPDATE PROXY_BIDS 
      SET max_bid_amount = max_limit 
      WHERE max_bid_amount IS NULL AND max_limit IS NOT NULL;
    `);

    // Ensure unique index on (auction_id, bidder_id) for ON CONFLICT support
    try {
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS unique_proxy_auction_bidder ON PROXY_BIDS (auction_id, bidder_id);
      `);
      console.log('Created unique index on PROXY_BIDS(auction_id, bidder_id).');
    } catch (e: any) {
      console.log('Index note:', e.message);
    }

    console.log('2. Updating enforce_minimum_increment to support all-in proxy limits...');
    await client.query(`
      CREATE OR REPLACE FUNCTION enforce_minimum_increment() RETURNS TRIGGER AS $$
      DECLARE
          v_current_highest NUMERIC(12, 2);
          v_required_increment NUMERIC(12, 2);
          v_max_proxy NUMERIC(12, 2);
      BEGIN
          SELECT current_highest_bid INTO v_current_highest FROM AUCTIONS WHERE auction_id = (NEW).auction_id;
          IF v_current_highest IS NULL OR v_current_highest = 0.00 THEN 
              RETURN NEW; 
          END IF;

          IF v_current_highest < 100.00 THEN 
              v_required_increment := 1.00;
          ELSIF v_current_highest < 500.00 THEN 
              v_required_increment := 5.00;
          ELSIF v_current_highest < 2500.00 THEN 
              v_required_increment := 25.00;
          ELSE 
              v_required_increment := 100.00; 
          END IF;

          -- Allow proxy cap when pushing all-in to the user's exact max limit
          SELECT COALESCE(max_bid_amount, max_limit) INTO v_max_proxy
          FROM PROXY_BIDS
          WHERE auction_id = (NEW).auction_id 
            AND bidder_id = (NEW).bidder_id 
            AND is_active = TRUE;

          IF v_max_proxy IS NOT NULL AND (NEW).bid_amount = v_max_proxy AND (NEW).bid_amount > v_current_highest THEN
              RETURN NEW;
          END IF;

          IF (NEW).bid_amount < (v_current_highest + v_required_increment) THEN
              RAISE EXCEPTION 'Bid must be at least % higher than the current bid.', v_required_increment USING ERRCODE = 'P0003';
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('3. Creating handle_proxy_bidding function (discrete scalar types)...');
    await client.query(`
      CREATE OR REPLACE FUNCTION handle_proxy_bidding() RETURNS TRIGGER AS $$
      DECLARE
          v_proxy_bidder_id INT;
          v_max NUMERIC(12, 2);
          v_increment NUMERIC(12, 2);
          v_counter_bid NUMERIC(12, 2);
      BEGIN
          -- Prevent infinite recursion: only process top-level bids
          IF pg_trigger_depth() > 1 THEN
              RETURN NEW;
          END IF;

          -- Find the active proxy limit for that auction_id that belongs to a different user
          -- and has a max_bid_amount strictly greater than the new bid_amount
          SELECT bidder_id, COALESCE(max_bid_amount, max_limit)
          INTO v_proxy_bidder_id, v_max
          FROM PROXY_BIDS
          WHERE auction_id = (NEW).auction_id
            AND bidder_id != (NEW).bidder_id
            AND is_active = TRUE
            AND COALESCE(max_bid_amount, max_limit) > (NEW).bid_amount
          ORDER BY COALESCE(max_bid_amount, max_limit) DESC, created_at ASC
          LIMIT 1;

          -- If no valid proxy exists, exit
          IF v_proxy_bidder_id IS NULL OR v_max IS NULL THEN
              RETURN NEW;
          END IF;

          -- Tier increment calculation based on (NEW).bid_amount
          IF (NEW).bid_amount < 100.00 THEN
              v_increment := 1.00;
          ELSIF (NEW).bid_amount < 500.00 THEN
              v_increment := 5.00;
          ELSIF (NEW).bid_amount < 2500.00 THEN
              v_increment := 25.00;
          ELSE
              v_increment := 100.00;
          END IF;

          -- Calculate required counter-bid
          v_counter_bid := (NEW).bid_amount + v_increment;

          -- Ensure counter-bid does not exceed user's max_bid_amount;
          -- if required increment pushes it over, bid exactly their max_bid_amount
          IF v_counter_bid > v_max THEN
              v_counter_bid := v_max;
          END IF;

          -- Insert counter-bid into BIDS table
          IF v_counter_bid > (NEW).bid_amount THEN
              -- Synchronize current_highest_bid so trigger checks against (NEW).bid_amount
              UPDATE AUCTIONS
              SET current_highest_bid = (NEW).bid_amount
              WHERE auction_id = (NEW).auction_id;

              INSERT INTO BIDS (auction_id, bidder_id, bid_amount)
              VALUES ((NEW).auction_id, v_proxy_bidder_id, v_counter_bid);

              UPDATE AUCTIONS
              SET current_highest_bid = v_counter_bid
              WHERE auction_id = (NEW).auction_id;
          END IF;

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('4. Creating AFTER INSERT trigger execute_proxy_bid_trg on BIDS...');
    await client.query(`
      DROP TRIGGER IF EXISTS execute_proxy_bid_trg ON BIDS;
      CREATE TRIGGER execute_proxy_bid_trg
      AFTER INSERT ON BIDS
      FOR EACH ROW
      EXECUTE FUNCTION handle_proxy_bidding();
    `);

    console.log('Proxy Bidding Engine applied successfully!');
  } catch (err) {
    console.error('Error applying proxy engine:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

applyProxyEngine();
