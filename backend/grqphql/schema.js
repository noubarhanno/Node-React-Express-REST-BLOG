const { buildSchema } = require('graphql');

//hello: String will return string
//hello: String! will return String and will be required

// createdAt is string because graphql doesn't know data type

// below how to defin a mutation and in the RootMutation type we tell graphql that we gonna expect a userInput of Type userInputData which is already defined
// also and we expect to return a User type when we create
module.exports = buildSchema(`

    type Post{
        _id: ID!
        title: String!
        content: String!
        imageUrl: String!
        creator: User!
        createdAt: String!
        updatedAt: String!
    }

    type User{
        _id: ID!
        name: String!
        email: String!
        password: String
        status: String!
        Post: [Post!]!
    }

    type AuthData{
        token: String
        userId: String
    }

    type PostData{
        posts: [Post!]
        totalPosts: Int!
    }

    type RootQuery {
        login(email: String, password: String): AuthData
        posts(page: Int): PostData!
        post(postId: ID!): Post!
        user: User!
    }

    input userInputData {
        email: String!
        name: String!
        password: String!
    }

    input postInputData {
        title: String!
        content: String!
        imageUrl: String!
    }

    type RootMutation{
        createUser(userInput: userInputData): User!
        createPost(postInput: postInputData): Post!
        updatePost(id: ID!, postInput: postInputData): Post!
        deletePost(id: ID!): Boolean
        updateStatus(status: String!): User!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);