const { query } = require('./src/config/database');

async function checkDuplicates() {
  try {
    console.log('Checking for duplicate score breakdowns...');
    const res = await query(`
      SELECT session_id, COUNT(*) 
      FROM score_breakdowns 
      GROUP BY session_id 
      HAVING COUNT(*) > 1
    `);
    
    if (res.rows.length === 0) {
      console.log('No duplicates found in score_breakdowns.');
    } else {
      console.log('Found duplicates:', res.rows);
      
      for (const row of res.rows) {
        console.log(`Cleaning up session: ${row.session_id}`);
        // Keep ONLY the one latest entry for each session_id
        await query(`
          DELETE FROM score_breakdowns 
          WHERE session_id = $1 
          AND id NOT IN (
            SELECT id 
            FROM score_breakdowns 
            WHERE session_id = $1 
            ORDER BY created_at DESC 
            LIMIT 1
          )
        `, [row.session_id]);
      }
      console.log('✅ Cleanup complete.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

checkDuplicates();
