import { validateRegister } from './../utils/validateRegister';
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from './../constans';
import { User } from './../entities/User';
import { MyContext } from 'src/type';
import { Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import argon2 from 'argon2';
import { UsernamePasswordInput } from './UsernamePasswordInput';
import { sendEmail } from './../utils/sendEmail';
import { v4 } from 'uuid';

@ObjectType()
class FieldError {
  @Field()
  field: String

  @Field()
  message: String
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[]

  @Field(() => User, { nullable: true })
  user?: User
}

@Resolver()
export class UserResolver {
  @Mutation(() => Boolean)
  async forgotPassword(@Arg('email') email: string, @Ctx() { em, redis } : MyContext) {
    const user = await em.findOne(User, {email})
    if (!user){
      return true;
    }

    const token = v4();

    await redis.set(
      FORGOT_PASSWORD_PREFIX + token,
      user.id,
      'ex',
      1000 * 60 * 60 * 24 * 3
    ); // 3 days

    await sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">reset password</a>`
    );

    return true;
  }
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req, em }: MyContext){
    console.log("session: ", req.session)
    if (!req.session.userId){
      return null
    }
    const user = await em.findOne(User, { id: req.session.userId })
    return user
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegister(options);
    if (errors) return { errors };

    const hashedPassword = await argon2.hash(options.password);
    const user = em.create(User, {
      username: options.username,
      password: hashedPassword,
      email: options.email,
      created_at: new Date(),
      updated_at: new Date()
    })

    try {
      await em.persistAndFlush(user)
    } catch (error){
      if (error.code == "23505"){
        // duplicate username error
        return {
          errors: [{
            field: "username",
            message: "username already taken"
          }]
        }
      }
    }

    req.session.userId = user.id

    return { user }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password:  string,
    @Ctx() { em, req }: MyContext
  ) : Promise<UserResponse> {
    const user = await em.findOne(User,
      usernameOrEmail.includes('@') ? { email: usernameOrEmail } : { username: usernameOrEmail }
    )
    if (!user){
      return {
        errors: [{
          field: 'usernameOrEmail',
          message: "that username doesnt exist"
        }]
      }
    }
    const valid = await argon2.verify(user.password, password)
    if (!valid){
      return {
        errors: [{
          field: 'password',
          message: "incorrect password"
        }]
      }
    }

    // store user id session
    // this will set a cookie on the user
    // keep them logged in
    req.session.userId = user.id
    req.session.user = user

    return { user }
  }

  @Mutation(() => Boolean)
  logout(@Ctx() {req, res }: MyContext) {
    return new Promise(resolve => req.session.destroy(err => {
      res.clearCookie(COOKIE_NAME)
      if (err){
        console.log(err)
        resolve(false)
        return
      }

      resolve(true)
    }))
  }
}