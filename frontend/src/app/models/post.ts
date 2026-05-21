export interface Post {
  id: number;
  title: string;
  slug: string;
  body: string;
  image: string | null;
  authorId: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostCreate {
  title: string;
  body: string;
}

export interface PostUpdate {
  title?: string;
  body?: string;
}
