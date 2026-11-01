// Loaded before every test file (see the test script in package.json).
// Each test file runs in its own process, so each gets its own fresh in-memory database.
process.env.DB_PATH = ':memory:';
