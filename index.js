const { ApolloServer, gql, PubSub, withFilter } = require('apollo-server');
const uuidv4 = require('uuid/v4');

const pubsub = new PubSub();
const TODO_ADDED = 'TODO_ADDED';
const NOTE_ADDED = 'NOTE_ADDED';

const todos = [
  {
    id: '1',
    name: 'First todo',
    description: 'something about the todo',
    notes: [
      {
        id: '1',
        text: 'this is the first note'
      },
      {
        id: '2',
        text: 'this is the second note'
      }
    ]
  },
  {
    id: '2',
    name: 'Second todo',
    description: 'something about another todo',
    notes: []
  }
];

const typeDefs = gql`
  """
  Todo
  """
  type Todo {
    id: ID!
    name: String!
    description: String
    notes: [Note]
  }

  type Note {
    id: ID!
    text: String!
  }

  """
  Create a new Todo by providing a name and optionally a description
  """
  input TodoInput {
    name: String!
    description: String
  }

  input NoteInput {
    id: ID!
    text: String!
  }

  type Query {
    "Query that returns all Todos"
    listTodos: [Todo]
    "Query that returns a single Todo given an id"
    getTodo(id: ID!): Todo
  }

  type Mutation {
    "Add a Todo"
    addTodo(input: TodoInput): Todo
    "Add a Note to a Todo"
    addNote(input: NoteInput): Note
  }

  type Subscription {
    todoAdded: Todo
    noteAdded(todoId: ID!): Note
  }
`;

const resolvers = {
  Query: {
    listTodos: () => todos,
    getTodo: (_, { id }) => todos.find((todo) => todo.id === id)
  },
  Mutation: {
    addTodo: (_, { input: { name, description } }) => {
      const newTodo = {
        id: uuidv4(),
        name: name,
        description: description ? description : '',
        notes: []
      };
      todos.push(newTodo);
      pubsub.publish(TODO_ADDED, { todoAdded: newTodo });
      return newTodo;
    },
    addNote: (_, { input: { id, text } }) => {
      const todo = todos.find((todo) => todo.id === id);
      if (!todo) {
        throw new Error('Could not find Todo');
      }
      const newNote = { id: uuidv4(), text };
      if (!todo.notes) {
        todo.notes = [newNote];
      } else {
        todo.notes.push(newNote);
      }
      pubsub.publish(NOTE_ADDED, { noteAdded: newNote, todoId: todo.id });
      return newNote;
    }
  },
  Subscription: {
    todoAdded: {
      subscribe: () => pubsub.asyncIterator([TODO_ADDED])
    },
    noteAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([NOTE_ADDED]),
        (payload, variables) => {
          return payload.todoId === variables.todoId;
        }
      )
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req, connection }) => {
    if (connection) {
      console.log('connection.context: ', connection.context);
      return connection.context;
    } else {
      const token = req.headers.authorization || '';
      console.log('token: ', token);
      return token;
    }
  },
  subscriptions: {
    onConnect: (connectionParams, webSocket) => {
      if (connectionParams.authToken) {
        console.log('subscription authToken: ', connectionParams.authToken);
        return true;
      }
    }
  }
});

server.listen().then(({ url, subscriptionsUrl }) => {
  console.log(`Server ready at ${url}`);
  console.log(`Subscriptions ready at ${subscriptionsUrl}`);
});
