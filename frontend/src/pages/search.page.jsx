import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import InpageNavigation from "../components/inpage-navigation.component";
import { filterPaginationData } from "../common/filter-pagination-data";
import BlogPostCard from "../components/blog-post.component";
import NoDataMessage from "../components/nodata.component";
import LoadMoreBtn from "../components/load-more.component";
import AnimationWrapper from "../common/page-animation";
import Loader from "../components/loader.component";
import axios from "axios";
import UserCard from "../components/usercard.component";

const SearchPage = () => {
  const { query } = useParams();
  const [blogs, setBlogs] = useState(null);
  const [users, setUsers] = useState(null);

  const searchBlogs = ({ page = 1, create_new_arr = false }) => {
    axios
      .post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs", {
        query,
        page,
      })
      .then(async ({ data }) => {
        let formatedData = await filterPaginationData({
          state: blogs,
          data: data.blogs,
          page,
          countRoute: "/search-blogs-count",
          data_to_send: { query },
          create_new_arr,
        });

        setBlogs(formatedData);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const fetchUser = () => {
    axios
      .post(import.meta.env.VITE_SERVER_DOMAIN + "/search-users", {
        query,
      })
      .then(({ data: { users } }) => {
        setUsers(users);
      });
  };

  useEffect(() => {
    setBlogs(null);
    setUsers(null);
    searchBlogs({ page: 1, create_new_arr: true });
    fetchUser();
  }, [query]);

  const UserCardWrapper = () => {
    return (
      <>
        {users === null ? (
          <Loader />
        ) : users.length ? (
          users.map((user, id) => {
            return (
              <AnimationWrapper
                key={id}
                transition={{ duration: 1, delay: id * 0.1 }}
              >
                <UserCard user={user} />
              </AnimationWrapper>
            );
          })
        ) : (
          <NoDataMessage message={"No User Found"} />
        )}
      </>
    );
  };

  return (
    <section className="h-cover flex justify-center gap-10">
      <div className="w-full">
        <InpageNavigation
          routes={[`Search results for ${query}`, "Accounts Matched"]}
          defaultHidden={["Accounts Matched"]}
        >
          <>
            {blogs === null ? (
              <Loader />
            ) : blogs.results.length ? (
              blogs.results.map((blog, i) => {
                return (
                  <AnimationWrapper
                    key={i}
                    transition={{ duration: 1, delay: i * 0.1 }}
                  >
                    <BlogPostCard
                      content={blog}
                      author={blog.author.personal_info}
                    />
                  </AnimationWrapper>
                );
              })
            ) : (
              <NoDataMessage message="No Blogs published yet!!" />
            )}

            <LoadMoreBtn state={blogs} fetchMoreDataFun={searchBlogs} />
          </>

          <UserCardWrapper />
        </InpageNavigation>
      </div>

      <div className="min-w-[40%] lg:min-w-[350px] max-w-min border-l border-grey pl-8 pt-3 max-md:hidden">
        <h1 className="font-medium text-xl mb-8">
          Users related to search
          <i className="fi fi-rr-user mt-1 ml-2"></i>
        </h1>

        <UserCardWrapper />
      </div>
    </section>
  );
};

export default SearchPage;
