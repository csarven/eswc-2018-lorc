/** eswc-2018-lorc
 *
 * https://github.com/csarven/eswc-2018-lorc
 *
 * Copyright 2018 Sarven Capadisli <info@csarven.ca> http://csarven.ca/#i
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

var fs = require('fs');
var uuid = require('node-uuid');
var mayktso = require('mayktso');
// var minimist = require('minimist');
var tidy = require("tidy-html5").tidy_html5;

// var config = mayktso.config();

var getResource = mayktso.getResource;
var getResourceHead = mayktso.getResourceHead;
var getResourceOptions = mayktso.getResourceOptions;
var postResource = mayktso.postResource;
var htmlEntities = mayktso.htmlEntities;
var preSafe = mayktso.preSafe;
var vocab = mayktso.vocab;
var prefixes = mayktso.prefixes;
var prefixesRDFa = mayktso.prefixesRDFa;
var getGraph = mayktso.getGraph;
var getGraphFromData = mayktso.getGraphFromData;
var serializeData = mayktso.serializeData;
var SimpleRDF = mayktso.SimpleRDF;
var RDFstore = mayktso.RDFstore;
var parseLinkHeader = mayktso.parseLinkHeader;
var parseProfileLinkRelation = mayktso.parseProfileLinkRelation;
var getBaseURL = mayktso.getBaseURL;
var getExternalBaseURL = mayktso.getExternalBaseURL;
var XMLHttpRequest = mayktso.XMLHttpRequest;
var discoverInbox = mayktso.discoverInbox;
var getInboxNotifications = mayktso.getInboxNotifications;
var resStatus = mayktso.resStatus;

var addVocab = {
  "frbrrealization": { "@id": "http://purl.org/vocab/frbr/core#realization", "@type": "@id", "@array": true },
  "citoisReviewedBy": { "@id": "http://purl.org/spar/cito/isReviewedBy", "@type": "@id", "@array": true },
  "oaannotation": { "@id": "http://www.w3.org/ns/oa#Annotation", "@type": "@id" },
  "oahasBody": { "@id": "http://www.w3.org/ns/oa#hasBody", "@type": "@id" },
  "oahasTarget": { "@id": "http://www.w3.org/ns/oa#hasTarget", "@type": "@id" },
  "oamotivatedBy": { "@id": "http://www.w3.org/ns/oa#motivatedBy", "@type": "@id" }
}

Object.assign(vocab, addVocab)

  // "custom-tags": "inline",
var tidyOptions = {
  "quiet": true,
  "show-warnings": false,
  "show-errors": 0,
  "indent": true,
  "vertical-space": false,
  "wrap": 0,
  "indent": true,
  "indent-spaces": 2,

  "doctype": "html5",
  "drop-empty-elements": false,
  "drop-proprietary-attributes": false,

  "new-blocklevel-tags": "main, n"
}

var lorcInboxURL = 'https://linkedresearch.org/inbox/linkedresearch.org/cloud/';
var notificationsList = [];

if(!module.parent) {
  init();
}

function init(options){
  // argv = minimist(process.argv.slice(2));

  // if (process.argv.length > 2) {
  //   processArgs(argv);
  // }
  // else {
    getArticleReviews();
  // }
}

function getDocumentURIs(articles) {
  articles = articles || [];

  // console.log('__dirname: ' + __dirname);
  // var uriList = __dirname + '/uri-list.test';
  // var uriList = __dirname + '/uri-list.accepted';
  var uriList = __dirname + '/uri-list';

  if (fs.existsSync(uriList)){
    var files = [ uriList ];

    var fileContents = files.map((file) => {
      try {
        return fs.readFileSync(file, 'utf8')
      } catch (error) {
        return null
      }
    });

    // console.log(fileContents);

    var articles = fileContents[0].trim().split("\n")

    // console.log('articles:');
    console.log(articles);
  }

  return articles;
}

function getArticleReviews(articles) {
  articles = articles || [];

  if (articles.length == 0) {
    articles = getDocumentURIs(articles);
  }

  var headers = {};
  headers['Accept'] = 'text/html, application/xhtml+xml';

  articles.forEach(function(article) {
    var pIRI = article;

    getResource(pIRI, headers).then(
      function(response){
// console.log(pIRI)

        // console.log(response.xhr.getAllResponseHeaders());
        // console.log('');
        var data = response.xhr.responseText;
        // console.log(data)

        var fromContentType = 'text/html';

        var options = {
          'contentType': fromContentType,
          'subjectURI': pIRI
        };


// tidyOptions = {};
        data = tidy(data, tidyOptions);
        // console.log(data);

        getGraphFromData(data, options).then(
          function(i) {
            var s = SimpleRDF(vocab, options['subjectURI'], i, RDFstore).child(options['subjectURI']);

// console.log(s.toString())

            var realizations = s.frbrrealization;
// console.log(realizations)
            if (realizations._array.length > 0) {
// console.log(realizations._array)

              realizations.forEach(function(r){
                var realisation = s.child(r);
// console.log(realisation.toString())

                var isReviewedBy = realisation.citoisReviewedBy;

                // console.log(isReviewedBy._array)

                if (isReviewedBy._array.length > 0) {
                  var notifications = {};

                  isReviewedBy.forEach(function(a){
                    var annotation = s.child(a);

                    var asObject = a;
                    var asTarget = annotation.oahasTarget
                    var motivatedBy = annotation.oamotivatedBy;
                    var motivatedByLabel = motivatedBy.substr(motivatedBy.lastIndexOf('#') + 1);
                    var datetime = getDateTimeISO();
                    var asactor = 'https://github.com/csarven/eswc-lorc';

                    notifications[a] = `<!DOCTYPE html>
<html lang="en" xml:lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <title>Notification: Review Announced</title>
  </head>

  <body about="" prefix="xsd: http://www.w3.org/2001/XMLSchema# rdf: http://www.w3.org/1999/02/22-rdf-syntax-ns# as: https://www.w3.org/ns/activitystreams# oa: http://www.w3.org/ns/oa# schema: http://schema.org/">
    <main>
      <article about="">
        <h1 property="schema:name">Notification: Review Announced</h1>

        <section>
          <dl about="">
            <dt>Types</dt><dd><a about="" href="https://www.w3.org/ns/activitystreams#Announce" typeof="as:Announce">Announce</a></dd>
            <dt>Object</dt><dd><a href="${asObject}" property="as:object">${asObject}</a></dd>
            <dt>Target</dt><dd><a href="${asTarget}" property="as:target">${asTarget}</a></dd>
            <dt>Updated</dt><dd><time datetime="${datetime}" datatype="xsd:dateTime" property="as:updated" content="${datetime}">${datetime.substr(0,19).replace('T', ' ')}</time></dd>
            <dt>Actor</dt><dd><a href="${asactor}" property="as:actor">${asactor}</a></dd>
            <dt>License</dt><dd><a href="https://creativecommons.org/publicdomain/zero/1.0/" property="schema:license">https://creativecommons.org/publicdomain/zero/1.0/</a></dd>
          </dl>
          <dl about="${asObject}">
            <dt>Object type</dt><dd><a about="${asObject}" typeof="oa:Annotation" href="http://www.w3.org/ns/oa#Annotation">Annotation</a></dd>
            <dt>Motivation</dt><dd><a href="${motivatedBy}" property="oa:motivation">${motivatedByLabel}</a></dd>
          </dl>
        </section>
      </article>
    </main>
  </body>
</html>
`;

                  });
// console.log(notifications)
                  Object.keys(notifications).forEach(function(i) {
                    var data = notifications[i];
// console.log(data)
                    var headers = {
                      'Slug': uuid.v1(),
                      'Content-Type': 'text/html'
                    }

                    postResource(lorcInboxURL, headers['Slug'], data, headers['Content-Type']).then(
                      function(response){
                        var location = response.xhr.getResponseHeader('Location');
                        notificationsList.push(location)

console.log(location)

// console.log(response.xhr);
// console.log('HTTP/1.1 ' + response.xhr.status + ' ' + response.xhr.statusText);
// console.log(response.xhr.getAllResponseHeaders());
// console.log('');
// if(response.xhr.responseText.length > 0){
//   console.log(response.xhr.responseText);
// }
                      },
                      function(reason){
                        console.log('Not Found:');
                        console.dir(reason);
                      }
                    );
                  })
                }
                else {
                  console.log('No reviews found at: ' + options['subjectURI'])
                }
              });
            }

          }
        );

      },
      function(reason){
        return reason;
      }
    )


    // .then(function(i) {
    //   console.log(notificationsList)
    // })


  })
}

function getDateTimeISO() {
  var date = new Date();
  return date.toISOString();
}

// module.exports = {
//
// }
