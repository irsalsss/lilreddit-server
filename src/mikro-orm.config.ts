import { User } from './entities/User';
import { MikroORM } from '@mikro-orm/core';
import { __prod__ } from './constans';
import { Post } from './entities/Post';
import path from "path";

export default {
  migrations: {
    path: path.join(__dirname, "./migrations"),
    pattern: /^[\w-]+\d+\.[tj]s$/
  },
  entities: [Post, User],
  dbName: 'fullstack-graphql',
  type: "postgresql",
  debug: !__prod__
} as Parameters<typeof MikroORM.init>[0]