import { ObjectId } from "mongodb";
import { Post } from "./Post";
import { Comment } from "./Comment";

export interface User {
  _id?: ObjectId; // optional during creation
  id: number;     // your own numeric ID
  name: string;
  username: string;
  email: string;
  address: {
    street: string;
    suite: string;
    city: string;
    zipcode: string;
    geo: {
      lat: string;
      lng: string;
    };
  };
  phone: string;
  website: string;
  company: {
    name: string;
    catchPhrase: string;
    bs: string;
  };
}

export type UserWithPostsAndComments = Omit<User, "_id"> & {
  posts: (Omit<Post, "_id" | "userId"> & { comments: Omit<Comment, "_id" | "postId">[] })[];
};

