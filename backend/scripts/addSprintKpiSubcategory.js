const db = require('../config/database');

const run = async () => {
  try {
    await db.query(`
      ALTER TABLE sprint_kpi_entries
      ADD COLUMN IF NOT EXISTS kpi_subcategory VARCHAR(100) NOT NULL DEFAULT 'Requirement' AFTER kpi_category
    `);

    try {
      await db.query(`
        ALTER TABLE sprint_kpi_entries
        DROP INDEX unique_story_kpi
      `);
    } catch (error) {
      if (error && error.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.warn('Unique index drop skipped:', error.message);
      }
    }

    await db.query(`
      ALTER TABLE sprint_kpi_entries
      ADD UNIQUE KEY unique_story_kpi (story_id, kpi_category, kpi_subcategory, kpi_option)
    `);

    console.log('Sprint KPI subcategory migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Sprint KPI subcategory migration failed:', error);
    process.exit(1);
  }
};

run();
