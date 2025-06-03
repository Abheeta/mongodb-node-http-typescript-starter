import { ObjectId } from "mongodb";

export interface Post {
  _id?: ObjectId;
  id: number;           // your own numeric ID
  userId: number;     // reference to `users._id`
  title: string;
  body: string;
}
