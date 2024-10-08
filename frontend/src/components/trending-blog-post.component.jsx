import { Link } from "react-router-dom";
import { getDay } from "../common/date";

const TrendingBlogPosts = ({ content, author, index }) => {
  const { publishedAt, title, blog_id: id } = content;
  const { profile_img, username } = author;

  return (
    <Link to={`/blog/${id}`} className="flex gap-5 mb-8">
      <h1 className="blog-index">
        {index < 10 ? "0" + (index + 1) : index + 1}
      </h1>

      <div>
        <div className="flex gap-2 items-center mb-7">
          <img
            src={profile_img}
            alt="author"
            className="w-6 h-6 rounded-full"
          />
          <p className="line-clamp-1">@{username}</p>
          <p className="min-w-fit">{getDay(publishedAt)}</p>
        </div>

        <h1 className="blog-title">{title}</h1>
      </div>
    </Link>
  );
};

export default TrendingBlogPosts;
