// filesystem stuff
const fs = require('fs-extra')
const dirTree = require("directory-tree");

// handling markdown
const MarkdownIt = require('markdown-it'),
md = new MarkdownIt();
const attrs = require('markdown-it-attrs');
md.use(attrs);

//for deployment
var s3 = require('s3');
var AWS = require('aws-sdk');

// html template building
const nunjucks = require('nunjucks');
const dateFilter = require('nunjucks-date-filter');
dateFilter.setDefaultFormat('dddd, MMMM Do YYYY, h:mm:ss a');
let env = nunjucks.configure({ autoescape: true });
env.addFilter('date', dateFilter);

// a helper function to get meta-data from markdown files
function getMeta(contents, meta) {
  var regStr = `\\[meta-${meta}\\]: <>\\s\\(*(.+)\\)\\s*`;
  var reg = new RegExp(regStr);
  const stringReturn = (contents.match(reg) || []).map(e => e.replace(reg, '$1'));
  if (stringReturn[0]) {
    return stringReturn[0];
  } else {
    return null;
  }
}

function renderChildNode (node, indent) {
    let thisHtml = '';
    if (node && node.length > 0) {
        node.forEach(child => {
            child.css && child.css !== '' ? thisHtml += `<div class="${child.css}">` : thisHtml += `<div>`;

            if (child.html) { thisHtml += child.html }
            if (child.children) {
                thisHtml += renderChildNode(child.children);
            }
            thisHtml += `</div>`;
        });
    }
    return thisHtml;
}

function render(node, inFolder, outFolder, siteConfig) {

    // get the contents of the template file
    var template = fs.readFileSync('themes/'+ siteConfig.theme +'/page.html', 'utf8');

    node.forEach((page) => {


          if (page.path && page.type === 'file' && page.extension === '.json') {
    
            // get contents of json from disk
            const jsonFile = fs.readFileSync(page.path, 'utf8');
            const jsonData = JSON.parse(jsonFile);
              //console.log(jsonData.body);

              if (jsonData.body) {
                  jsonData.rendered = renderChildNode(jsonData.body);
                  console.log(jsonData.rendered);
              }
              jsonData.debug = `<pre>${jsonFile}</pre>`;
            // final rendered page with html and data
            const htmlRender = nunjucks.renderString(template, jsonData);

            // replace md in the filename for html
            page.filename = page.name.substr(0, page.name.lastIndexOf(".")) + ".html";

            // write the file back to disk, at the moment, flat file structure
            fs.writeFileSync(outFolder + '/' + page.filename, htmlRender);
            console.log(outFolder + '/' + page.filename + ' written.');

          }

    });

  }

function build (inFolder, outFolder, siteConfig) {

  try {
      fs.copySync(inFolder + '/assets/images', outFolder + '/assets/images');
      fs.copySync('themes/'+ siteConfig.theme + '/assets/css', outFolder + '/assets/css');
      fs.copySync('themes/'+ siteConfig.theme + '/assets/js', outFolder + '/assets/js');
    const tree = dirTree(inFolder);
    if (tree.children && inFolder && outFolder) {
      this.render(tree.children, inFolder, outFolder, siteConfig);
    }
  } catch (err) {
    console.error(err)
  }

}

module.exports = {
    render: render,
    build: build
}
