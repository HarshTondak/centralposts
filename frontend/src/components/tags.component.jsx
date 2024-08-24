import { useContext } from "react";
import { EditorContext } from "../pages/editor.pages";

const Tag = ({ tag, tagIndex }) => {
  let {
    blog: { tags },
    blog,
    setBlog,
  } = useContext(EditorContext);

  // To delete the tags
  const handleTagDelete = () => {
    tags = tags.filter((t) => t !== tag);

    setBlog({ ...blog, tags });
  };

  // To make the tags editable
  const addEditable = (e) => {
    e.target.setAttribute("contentEditable", true);
    e.target.focus();
  };

  // To edit the tags
  const handleTagEdit = (e) => {
    if (e.keyCode == 13 || e.keyCode == 188) {
      e.preventDefault();

      let currentTag = e.target.innerText;
      tags[tagIndex] = currentTag;
      setBlog({ ...blog, tags });
      e.target.setAttribute("contentEditable", false);
    }
  };

  return (
    <div className="relative py-2 mt-2 mr-2 px-5 pr-10 bg-white rounded-full inline-block hover:bg-opacity-50">
      <p
        className="outline-none"
        onClick={addEditable}
        onKeyDown={handleTagEdit}
      >
        {tag}
      </p>
      <button
        className="mt-[2px] rounded-full absolute right-3 top-1/2 -translate-y-1/2"
        onClick={handleTagDelete}
      >
        <i className="fi fi-rr-cross-circle pointer-events-none"></i>
      </button>
    </div>
  );
};

export default Tag;
