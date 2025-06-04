import { Post } from "../models/types/Post";
import {client} from "../db";

export const updatePost = async (post: Post) => {
  const db = client.db('swift-assess');
  const postsCol = db.collection<Post>('posts');

  // Step 1: Find the post by ID
  const existingPost = await postsCol.findOne({ id: post.id });

  if (!existingPost) {
    throw new Error('POST_NOT_FOUND'); // Case 2
  }

  if (existingPost.userId !== post.userId) {
    throw new Error('UNAUTHORIZED_USER'); // Case 1
  }

  // Step 2: Proceed with update
  const result = await postsCol.updateOne({ id: post.id }, { $set: post });

  if (result.modifiedCount === 0) {
    throw new Error('UPDATE_FAILED'); // Optional: could happen if same content is updated
  }
};
