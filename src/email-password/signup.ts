import { fromEvent, FunctionEvent } from 'graphcool-lib'
import { GraphQLClient } from 'graphql-request'
import * as bcrypt from 'bcryptjs'
import * as validator from 'validator'

interface User {
  id: string
}

interface EventData {
  email: string
  password: string
  name: string
  wooupUrl: string
  wooupCk: string
  wooupCs: string
  wooupKey: string
  wooupOrderId: string
  wooupProduct: string
  wooupStartDate: string
  wooupActive: boolean
  wooupVersion: string
}
const SALT_ROUNDS = 10

export default async (event: FunctionEvent<EventData>) => {
  console.log(event)

  try {
    const graphcool = fromEvent(event)
    const api = graphcool.api('simple/v1')

    const { email, password, name, wooupUrl, wooupCk, wooupCs, wooupKey, wooupOrderId, wooupProduct, wooupStartDate, wooupSubId, wooupActive, wooupVersion } = event.data

    if (!validator.isEmail(email)) {
      return { error: 'Not a valid email' }
    }

    // check if user exists already
    const userExists: boolean = await getUser(api, email)
      .then(r => r.User !== null)
    if (userExists) {
      return { error: 'Email already in use' }
    }

    // create password hash
    const salt = bcrypt.genSaltSync(SALT_ROUNDS)
    const hash = await bcrypt.hash(password, salt)

    let wooupEmail = email;
    // create new user
    const userId = await createGraphcoolUser(api, email, hash, name, wooupUrl, wooupCk, wooupCs, wooupEmail, wooupKey, wooupOrderId, wooupProduct, wooupStartDate, wooupSubId, wooupActive, wooupVersion )

    // generate node token for new User node
    const token = await graphcool.generateNodeToken(userId, 'User')

    return { data: { id: userId, token } }
  } catch (e) {
    console.log(e)
    return { error: 'An unexpected error occured during signup.' }
  }
}

async function getUser(api: GraphQLClient, email: string): Promise<{ User }> {
  const query = `
    query getUser($email: String!) {
      User(email: $email) {
        id
      }
    }
  `

  const variables = {
    email,
  }

  return api.request<{ User }>(query, variables)
}

async function createGraphcoolUser(api: GraphQLClient, email: string, password: string, name: string, wooupUrl: string, wooupCk: string, wooupCs: string, wooupEmail: string, wooupKey: string, wooupOrderId: string, wooupProduct: string,
wooupStartDate: string, wooupSubId: string, wooupActive: boolean, wooupVersion: string): Promise<string> {
  const mutation = `
    mutation createGraphcoolUser($email: String!, $password: String!, $name: String!, $wooupUrl: String!, $wooupCk: String!, $wooupCs: String!, $wooupEmail: String!, $wooupKey: String!, 
    $wooupOrderId: String!, $wooupProduct: String!, $wooupStartDate: String!, $wooupSubId: String!, $wooupActive: Boolean!, $wooupVersion: String!) {
      createUser(
        email: $email,
        password: $password
        name: $name
        wooupUrl: $wooupUrl                
        wooupCk: $wooupCk
        wooupCs: $wooupCs
        wooupEmail: $wooupEmail
        wooupKey: $wooupKey
        wooupOrderId: $wooupOrderId
        wooupProduct: $wooupProduct
        wooupStartDate: $wooupStartDate
        wooupSubId: $wooupSubId
        wooupActive: $wooupActive
        wooupVersion: $wooupVersion
      ) {
        id
        wooupUrl
      }
    }
  `

  const variables = {
    email,
    password: password,
    wooupUrl: wooupUrl,
    name: name,
    wooupEmail: wooupEmail,
    wooupCk: wooupCk,
    wooupCs: wooupCs,
    wooupKey: wooupKey,
    wooupOrderId: wooupOrderId,
    wooupProduct: wooupProduct,
    wooupStartDate: wooupStartDate,
    wooupSubId: wooupSubId,
    wooupActive: wooupActive,
    wooupVersion: wooupVersion
  }


  return api.request<{ createUser: User }>(mutation, variables)
    .then(r => r.createUser.id)
}
