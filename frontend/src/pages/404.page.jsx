import { Link } from "react-router-dom";
import pageNotFoundImage from "../imgs/404.png";
import fullLogo from "../imgs/full-logo.png";

const PageNotFound = () => {
  return (
    <section className="h-cover relative p-10 flex flex-col items-center gap-20 text-center">
      <img
        src={pageNotFoundImage}
        className="select-none object-cover rounded w-[400px]"
        alt="404 Not Found"
      />

      {/* <h1 className="text-4xl font-gelasio leading-7">Page not found</h1> */}

      <p className="text-dark-grey text-xl leading-7 -mt-28">
        The page you are looking for does not exist. Head back to the{" "}
        <Link to="/" className="text-black underline">
          HOME PAGE
        </Link>
      </p>

      <div className="mt-auto">
        <img
          src={fullLogo}
          className="w-[120px] object-contain block mx-auto select-none mb-4"
          alt="Full Logo"
        />
        <p>Read millions of stories around the world</p>
      </div>
    </section>
  );
};

export default PageNotFound;
