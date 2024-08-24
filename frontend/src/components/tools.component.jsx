// For adding Links from other websites such as youtube or insta
import Embed from "@editorjs/embed";
// For creating lists
import List from "@editorjs/list";
// For adding images
import Image from "@editorjs/image";
// For creating headings
import Header from "@editorjs/header";
// For adding quotes
import Quote from "@editorjs/quote";
// For highlighting
import Marker from "@editorjs/marker";
// For editing text format
import InlineCode from "@editorjs/inline-code";

import { uploadImage } from "../common/aws";

const uploadImageByURL = async (e) => {
  let link = new Promise((res, rej) => {
    try {
      res(e);
    } catch (err) {
      rej(err);
    }
  });

  return link.then((url) => {
    return {
      success: 1,
      file: { url },
    };
  });
};

const uploadImageByFile = (e) => {
  return uploadImage(e).then((url) => {
    if (url) {
      return {
        success: 1,
        file: { url },
      };
    }
  });
};

export const EditorTools = {
  embed: Embed,
  list: {
    class: List,
    inlineToolbar: true,
  },
  image: {
    class: Image,
    config: {
      uploader: {
        uploadByUrl: uploadImageByURL,
        uploadByFile: uploadImageByFile,
      },
    },
  },
  header: {
    class: Header,
    config: {
      placeholder: "Type Heading...",
      levels: [2, 3],
      defaultLevel: 2,
    },
  },
  quote: {
    class: Quote,
    inlineToolbar: true,
  },
  marker: Marker,
  inlineCode: InlineCode,
};
