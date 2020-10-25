import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { Field, ObjectType } from "type-graphql";

@ObjectType()
@Entity()
export class Post {
  @Field() // to show or to hide in query
  @PrimaryKey()
  id!: number;

  @Field(() => String) // to show or to hide in query
  @Property({ type: "date" })
  createdAt = new Date();

  @Field(() => String) // to show or to hide in query
  @Property({ type: "date", onUpdate: () => new Date() })
  updatedAt = new Date();

  @Field() // to show or to hide in query
  @Property({ type: "text" })
  title!: string;

}