const { ApolloServer, gql } = require('apollo-server');
const uuidv4 = require('uuid/v4');

const todos = [
  {
    id: '1',
    name: 'First todo',
    description: 'something about the todo'
  },
  {
    id: '2',
    name: 'Second todo',
    description: 'something about another todo'
  }
];

const typeDefs = gql`
  """
  An item on a Todo list
  """
  type Todo {
    id: ID!
    name: String!
    description: String
  }

  """
  Create a new Todo item by providing a name and optionally a description
  """
  input TodoInput {
    name: String!
    description: String
  }

  type Query {
    "Query that returns all Todo items"
    listTodos: [Todo]
    "Query that returns a single Todo item given an id"
    getTodo(id: String!): Todo
  }

  type Mutation {
    "Add a Todo item"
    addTodo(input: TodoInput): Todo
  }
`;

const resolvers = {
  Query: {
    listTodos: () => todos,
    getTodo: (_, args) => todos.find((todo) => todo.id === args.id)
  },
  Mutation: {
    addTodo: (_, args) => {
      const newTodo = {
        id: uuidv4(),
        name: args.input.name,
        description: args.input.description
      };
      todos.push(newTodo);
      return newTodo;
    }
  }
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
