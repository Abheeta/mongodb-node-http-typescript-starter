import { ObjectId } from "mongodb";

export interface Comment {
  _id?: ObjectId;
  id: number;           // your own numeric ID
  postId: number;     // reference to `posts._id`
  name: string;
  email: string;
  body: string;
}
