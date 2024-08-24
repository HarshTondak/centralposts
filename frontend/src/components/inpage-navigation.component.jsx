import { useEffect, useRef, useState } from "react";

export let activeTabRef;
export let activeTabLineRef;

const InpageNavigation = ({
  routes,
  defaultHidden = [],
  defaultActiveIndex = 0,
  children,
}) => {
  const [inPageNavIndex, setInPageNavIndex] = useState(defaultActiveIndex);
  activeTabLineRef = useRef();
  activeTabRef = useRef();

  const changePageState = (btn, i) => {
    let { offsetWidth, offsetLeft } = btn;
    activeTabLineRef.current.style.width = offsetWidth + "px";
    activeTabLineRef.current.style.left = offsetLeft + "px";

    setInPageNavIndex(i);
  };

  useEffect(() => {
    changePageState(activeTabRef.current, defaultActiveIndex);
  }, []);

  return (
    <>
      <div className="relative mb-8 bg-white border-b border-grey flex flex-nowrap overflow-x-auto">
        {routes.map((route, i) => {
          return (
            <button
              className={
                "py-4 px-5 capitalize " +
                (inPageNavIndex === i ? "text-black " : "text-dark-grey ") +
                (defaultHidden.includes(route) ? "md:hidden " : "")
              }
              key={i}
              onClick={(e) => {
                changePageState(e.target, i);
              }}
              ref={i === defaultActiveIndex ? activeTabRef : null}
            >
              {route}
            </button>
          );
        })}

        <hr ref={activeTabLineRef} className="absolute bottom-0 duration-300" />
      </div>

      {/*
        For Showing the Components only
        like for Home page -> Latest blogs
        and for Trending page -> Trending blogs 
      */}
      {Array.isArray(children) ? children[inPageNavIndex] : children}
    </>
  );
};

export default InpageNavigation;
