// controllers/deleteUserById.ts
import { client } from '../db';
import { User, UserWithPostsAndComments } from '../models/types/User';
import { Post } from '../models/types/Post';
import { Comment } from '../models/types/Comment';
import { MongoBulkWriteError } from 'mongodb';

export async function postUserById(userId: string, updatedUser: User): Promise<User> {
  const db = client.db('swift-assess');
  const usersCol = db.collection<User>('users');

  const user = await usersCol.findOne({ id: Number(userId) });

  if (!user) {
    throw new Error('NOT_FOUND');
  }

  // Replace existing fields with updated values
  await usersCol.updateOne({ id: Number(userId) }, { $set: updatedUser });

  return { ...user, ...updatedUser };
}

export async function insertUser(user: User): Promise<string> {
  if (!user.id) {
    throw new Error('INVALID_USER_DATA'); // you can add more validation if you want
  }

  const db = client.db('swift-assess');
  const usersCol = db.collection<User>('users');

  // Check if user already exists by id
  const existingUser = await usersCol.findOne({ id: user.id });
  if (existingUser) {
    throw new Error('USER_EXISTS');
  }

  await usersCol.insertOne(user);
  return `User with id ${user.id} created successfully.`;
}

export async function deleteUserById(userId: string): Promise<boolean> {
  const db = client.db('swift-assess');
  const usersCol = db.collection<User>('users');
  const postsCol = db.collection<Post>('posts');
  const commentsCol = db.collection<Comment>('comments');

  const userNumberId = Number(userId);

  // First, check if user exists
  const user = await usersCol.findOne({ id: userNumberId });
  if (!user) {
    throw new Error('NOT_FOUND');
  }

  // Find posts of this user
  const userPosts = await postsCol.find({ userId: userNumberId }).toArray();
  const postIds = userPosts.map(post => post.id);

  // Delete comments for these posts
  await commentsCol.deleteMany({ postId: { $in: postIds } });

  // Delete posts of user
  await postsCol.deleteMany({ userId: userNumberId });

  // Delete the user itself
  const result = await usersCol.deleteOne({ id: userNumberId });

  return result.deletedCount === 1;
}

export async function deleteAllUsers(): Promise<void> {
  const db = client.db('swift-assess');
  const usersCol = db.collection<User>('users');
  const postsCol = db.collection<Post>('posts');
  const commentsCol = db.collection<Comment>('comments');

  // Delete all comments first
  await commentsCol.deleteMany({});

  // Delete all posts
  await postsCol.deleteMany({});

  // Delete all users
  await usersCol.deleteMany({});
}

function fetchJson(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'jsonplaceholder.typicode.com',
      port: 80,
      path,
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    };

    const req = require('http').request(options, (res: any) => {
      let data = '';

      if (res.statusCode !== 200) {
        reject(new Error(`Request failed with status code: ${res.statusCode}`));
        res.resume();
        return;
      }

      res.on('data', (chunk: any) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

export async function getUserWithPostsAndComments(userId: string) {
  if (!userId.match(/^\d+$/)) {
    // or your validation logic for ID format
    throw new Error('INVALID_ID');
  }

  const db = client.db('swift-assess');
  const usersCol = db.collection<User>('users');
  const postsCol = db.collection<Post>('posts');
  const commentsCol = db.collection<Comment>('comments');

  // const user = await usersCol.findOne({ id: Number(userId) }, { projection: { _id: 0 } });
 

  // const posts = await postsCol.find({ userId: Number(userId) }).project({ _id: 0, userId: 0 }).toArray();
  // const postIds = posts.map(post => post.id);

  // const comments = await commentsCol.find({ postId: { $in: postIds } }).project({ _id: 0, postId: 0 }).toArray();

  const user = await usersCol.aggregate<[UserWithPostsAndComments]>(
    [
      {
        $match:
          /**
           * query: The query in MQL.
           */
          {
            id: Number(userId)
          }
      },
      {
        $project:
          /**
           * specifications: The fields to
           *   include or exclude.
           */
          {
            _id: 0
          }
      },
      {
        $lookup:
          /**
           * from: The target collection.
           * localField: The local join field.
           * foreignField: The target join field.
           * as: The name for the results.
           * pipeline: Optional pipeline to run on the foreign collection.
           * let: Optional variables to use in the pipeline field stages.
           */
          {
            from: "posts",
            localField: "id",
            foreignField: "userId",
            as: "posts"
          }
      },
      {
        $project:
          /**
           * specifications: The fields to
           *   include or exclude.
           */
          {
            "posts.userId": 0,
            "posts._id": 0
          }
      },
      {
        $unwind:
          /**
           * path: Path to the array field.
           * includeArrayIndex: Optional name for index.
           * preserveNullAndEmptyArrays: Optional
           *   toggle to unwind null and empty values.
           */
          {
            path: "$posts"
          }
      },
      {
        $lookup:
          /**
           * from: The target collection.
           * localField: The local join field.
           * foreignField: The target join field.
           * as: The name for the results.
           * pipeline: Optional pipeline to run on the foreign collection.
           * let: Optional variables to use in the pipeline field stages.
           */
          {
            from: "comments",
            localField: "posts.id",
            foreignField: "postId",
            as: "posts.comments"
          }
      },
      {
        $project:
          /**
           * specifications: The fields to
           *   include or exclude.
           */
          {
            "posts.comments._id": 0,
            "posts.comments.postId": 0
          }
      },
      {
        $group: {
          _id: "$id",
          id: {
            $first: "$id"
          },
          name: {
            $first: "$name"
          },
          username: {
            $first: "$username"
          },
          email: {
            $first: "$email"
          },
          address: {
            $first: "$address"
          },
          phone: {
            $first: "$phone"
          },
          website: {
            $first: "$website"
          },
          company: {
            $first: "$company"
          },
          posts: {
            $push: "$posts"
          }
        }
      },
      {
        $project: {
          _id: 0
        }
      }
    ]
  ).toArray();

  if (!user[0]) {
    throw new Error('NOT_FOUND');
  }

  return user[0];
}

export async function insertUserData(): Promise<void> {
  try {
    const db = client.db('swift-assess');

    const usersCol = db.collection<User>('users');
    const postsCol = db.collection<Post>('posts');
    const commentsCol = db.collection<Comment>('comments');

    // 1. Fetch users
    const users = await fetchJson('/users') as User[];
    const selectedUsers = users.slice(0, 10);
    const userIds = selectedUsers.map(user => user.id);

    // 2. Fetch posts for those users
    const allPosts = await fetchJson('/posts') as Post[];
    const filteredPosts = allPosts.filter(post => userIds.includes(post.userId));
    const postIds = filteredPosts.map(post => post.id);

    // 3. Fetch comments for those posts
    const allComments = await fetchJson('/comments') as Comment[];
    const filteredComments = allComments.filter(comment => postIds.includes(comment.postId));

    // 4. Bulk insert into collections
    await usersCol.bulkWrite(
      selectedUsers.map(user => ({ insertOne: { document: user } })),
    ).catch(error => 
      {
        if (error instanceof MongoBulkWriteError && error.code === 11000) {
           throw new Error('Trying to insert existing user');
        }
        console.error(error)
        throw error;
      }
  );

    await postsCol.bulkWrite(
      filteredPosts.map(post => ({ insertOne: { document: post } })),
    );

    await commentsCol.bulkWrite(
      filteredComments.map(comment => ({ insertOne: { document: comment } })),
    );

    // success = do nothing, caller will send 200
    return;
  } catch (error) {
    // Propagate error to caller
    throw error;
  }
}
