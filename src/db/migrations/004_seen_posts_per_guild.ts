export const sql = `
  CREATE TABLE seen_posts_new (
    guild_id TEXT NOT NULL,
    post_id TEXT NOT NULL,
    seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, post_id)
  );

  INSERT INTO seen_posts_new (guild_id, post_id, seen_at)
  SELECT config.guild_id, seen_posts.post_id, seen_posts.seen_at
  FROM seen_posts CROSS JOIN config;

  DROP TABLE seen_posts;
  ALTER TABLE seen_posts_new RENAME TO seen_posts;
`;
