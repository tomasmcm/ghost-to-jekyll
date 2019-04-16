#!/usr/bin/env node

const yaml   = require('js-yaml');
const fs     = require('fs');
const moment = require('moment');

function convert(filename) {
  console.log("converting " + filename);

  // first, let's make a directory here for _posts
  try {
    fs.mkdirSync("_posts");
  }
  catch (e) {
    // ignore the error, because the folder probably exists
  }
  try {
    fs.mkdirSync("_data");
  }
  catch (e) { }

  // parse the JS export from Ghost
  let exp = JSON.parse(fs.readFileSync(filename));

  writeTags(exp.db[0].data.tags);

  writeAuthors(exp.db[0].data.users);

  let tagList = {};
  exp.db[0].data.tags.forEach(function(t) {
    tagList[t.id] = t.slug;
  });

  let postTags = {};
  exp.db[0].data.posts_tags.forEach(function(e) {
    if(typeof postTags[e.post_id] == "undefined") {
      postTags[e.post_id] = [];
    }
    postTags[e.post_id].push(tagList[e.tag_id]);
  });
  console.log(postTags);

  let authors = {};
  exp.db[0].data.users.forEach(function(t) {
    authors[t.id] = t.name;
  });

  // now let's iterate the blog posts
  exp.db[0].data.posts.forEach(function(post) {
    convertPost(post, authors, postTags)
  });
}

function writeTags(tags) {
  let filename = '_data/tags.jsonp';
  console.log("  creating " + filename);

  let out = fs.createWriteStream(filename);
  out.write('callback([\n');
  let tagsJSONP = [];
  tags.forEach(function(tag) {
    tagsJSONP.push(`  {
    "id":${tag.id},
    "name":"${tag.slug}",
    "value":"${tag.slug}"
  }`);
  });
  out.write(tagsJSONP.join(',\n'));
  out.write('\n])\n', () => out.close());
}

function writeAuthors(authors) {
  let filename = '_data/authors.json';
  console.log("  creating " + filename);
  
  let out = fs.createWriteStream(filename);
  out.write('[\n');
  let authorsJSON = [];
  authors.forEach(function(author) {
    authorsJSON.push(`  {
    "author-id":${author.id},
    "full-name":"${author.name}",
    "slug":"${author.slug}",
    "email":"${author.email}",
    "image":${author.image ? '"'+author.image+'"' : null },
    "bio":${author.bio ? '"'+author.bio+'"' : null },
    "website":${author.website ? '"'+author.website+'"' : null },
    "location":${author.location ? '"'+author.location+'"' : null }
  }`);
  });
  out.write(authorsJSON.join(',\n'));
  out.write('\n]\n', () => out.close());
}

function convertPost(post, authors, postTags) {
  // there are two parts to a post: some front-matter and some content
  // they are separated by -- and the content goes in a file named
  // 'post-slug.markdown' in _posts

  let date = moment(post.published_at);
  if(!post.published_at) {
    date = moment(post.created_at);
  }
  let filename = `_posts/${date.format('YYYY-MM-DD')}-${post.slug}.md`;

  console.log("  creating " + filename);

  let out = fs.createWriteStream(filename);
  out.write('---\n');
  let markdown = post.markdown;
  delete post.markdown;
  delete post.html;
  let frontmatter = {
    title: post.title,
    layout: 'post',
    slug: post.slug,
    published: post.status === 'published',
    date: date.format('YYYY-MM-DD HH:mm:ss')
  };
  if(post.image) frontmatter.image = post.image;
  if(post.featured) frontmatter.featured = post.featured;
  if(post.meta_title) frontmatter["meta-title"] = post.meta_title;
  if(post.meta_description) frontmatter["meta-description"] = post.meta_description;
  if(post.author_id) frontmatter["author-id"] = post.author_id;
  if(post.author_id) frontmatter["author"] = authors[post.author_id];
  if(postTags[post.id]) frontmatter.tags = postTags[post.id];

  out.write(yaml.dump(frontmatter));
  out.write('---\n');
  out.write(markdown, () => out.close());
}

// run the command line arguments through the converter
process.argv.slice(2).forEach(convert);