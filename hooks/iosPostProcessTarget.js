//
//  iosAddTarget.js
//  This hook runs for the iOS platform when the plugin or platform is added.
//
// Source: https://github.com/DavidStrausz/cordova-plugin-today-widget
//

//
// The MIT License (MIT)
//
// Copyright (c) 2018 @ltan
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

const PLUGIN_ID = 'cordova-plugin-shared';
const BUNDLE_SUFFIX = '.shareextension';

var fs = require('fs');
var path = require('path');

function redError(message) {
  return new Error('"' + PLUGIN_ID + '" \x1b[1m\x1b[31m' + message + '\x1b[0m');
}

// function replacePreferencesInFile(filePath, preferences) {
//   var content = fs.readFileSync(filePath, 'utf8');
//   for (var i = 0; i < preferences.length; i++) {
//     var pref = preferences[i];
//     var regexp = new RegExp(pref.key, "g");
//     content = content.replace(regexp, pref.value);
//   }
//   console.log("replacePreferencesInFile:");
//   console.log(filePath);
//   fs.writeFileSync(filePath, content);
// }

function nonComments(obj) {
  var keys = Object.keys(obj),
    newObj = {},
    i = 0,
    COMMENT_KEY = /_comment$/;
  for (i; i < keys.length; i++) {
    if (!COMMENT_KEY.test(keys[i])) {
      newObj[keys[i]] = obj[keys[i]];
    }
  }

  return newObj;
}


findFileUUID = function (pbxProject, filePath) {
  var files = nonComments(pbxProject.pbxFileReferenceSection()),
    file, id;
  for (id in files) {
    file = files[id];
    if (file.path == filePath || file.path == ('"' + filePath + '"')) {
      return id;
    }
  }

  return undefined;
}
// Determine the full path to the app's xcode project file.
function findXCodeproject(context, callback) {
  fs.readdir(iosFolder(context), function (err, data) {
    var projectFolder;
    var projectName;
    // Find the project folder by looking for *.xcodeproj
    if (data && data.length) {
      data.forEach(function (folder) {
        if (folder.match(/\.xcodeproj$/)) {
          projectFolder = path.join(iosFolder(context), folder);
          projectName = path.basename(folder, '.xcodeproj');
        }
      });
    }

    if (!projectFolder || !projectName) {
      throw redError('Could not find an .xcodeproj folder in: ' + iosFolder(context));
    }

    if (err) {
      throw redError(err);
    }

    callback(projectFolder, projectName);
  });
}

// Determine the full path to the ios platform
function iosFolder(context) {
  return context.opts.cordova.project ?
    context.opts.cordova.project.root :
    path.join(context.opts.projectRoot, 'platforms/ios/');
}

// function getPreferenceValue(configXml, name) {
//   var value = configXml.match(new RegExp('name="' + name + '" value="(.*?)"', "i"));
//   if (value && value[1]) {
//     return value[1];
//   } else {
//     return null;
//   }
// }

// function getCordovaParameter(configXml, variableName) {
//   var variable;
//   var arg = process.argv.filter(function (arg) {
//     return arg.indexOf(variableName + '=') == 0;
//   });
//   if (arg.length >= 1) {
//     variable = arg[0].split('=')[1];
//   } else {
//     variable = getPreferenceValue(configXml, variableName);
//   }
//   return variable;
// }

function parsePbxProject(context, pbxProjectPath) {
  var xcode = context.requireCordovaModule('xcode');
  console.log('    Parsing existing project at location: ' + pbxProjectPath + '...');
  var pbxProject;
  if (context.opts.cordova.project) {
    pbxProject = context.opts.cordova.project.parseProjectFile(context.opts.projectRoot).xcode;
  } else {
    pbxProject = xcode.project(pbxProjectPath);
    pbxProject.parseSync();
  }
  // console.log(" post check 1");
  // console.log(pbxProject);
  return pbxProject;
}

// function forEachShareExtensionFile(context, callback) {
//   var shareExtensionFolder = path.join(iosFolder(context), 'ShareExtension');
//   fs.readdirSync(shareExtensionFolder).forEach(function (name) {
//     // Ignore junk files like .DS_Store
//     if (!/^\..*/.test(name)) {
//       callback({
//         name: name,
//         path: path.join(shareExtensionFolder, name),
//         extension: path.extname(name)
//       });
//     }
//   });
// }

// function projectPlistPath(context, projectName) {
//   return path.join(iosFolder(context), projectName, projectName + '-Info.plist');
// }

// function projectPlistJson(context, projectName) {
//   var plist = require('plist');
//   var path = projectPlistPath(context, projectName);
//   return plist.parse(fs.readFileSync(path, 'utf8'));
// }

// function getPreferences(context, configXml, projectName) {
//   var plist = projectPlistJson(context, projectName);
//   return [{
//     key: '__DISPLAY_NAME__',
//     value: getCordovaParameter(configXml, 'DISPLAY_NAME') || projectName
//   }, {
//     key: '__BUNDLE_IDENTIFIER__',
//     value: plist.CFBundleIdentifier + BUNDLE_SUFFIX
//   }, {
//     key: '__BUNDLE_SHORT_VERSION_STRING__',
//     value: plist.CFBundleShortVersionString
//   }, {
//     key: '__BUNDLE_VERSION__',
//     value: plist.CFBundleVersion
//   }, {
//     key: '__URL_SCHEME__',
//     value: getCordovaParameter(configXml, 'IOS_URL_SCHEME')
//   }, {
//     key: '\\$\\(CFBundleIdentifier\\)',
//     value: plist.CFBundleIdentifier
//   }];
// }

// // Return the list of files in the share extension project, organized by type
// var FILE_TYPES = {
//   '.h': 'source',
//   '.m': 'source',
//   '.plist': 'config',
//   '.entitlements': 'config',
// };

// function getShareExtensionFiles(context) {
//   var files = {
//     source: [],
//     config: [],
//     resource: []
//   };
//   forEachShareExtensionFile(context, function (file) {
//     var fileType = FILE_TYPES[file.extension] || 'resource';
//     files[fileType].push(file);
//   });
//   return files;
// }

// function longComment(file) {
//   return file.basename + " in " + file.group;
// }


// function pbxBuildPhaseObj(file) {
//   var obj = Object.create(null);

//   obj.value = file.uuid;
//   obj.comment = longComment(file);

//   return obj;
// }

// function printShareExtensionFiles(files) {
//   console.log('    Found following files in your ShareExtension folder:');
//   console.log('    Source files:');
//   files.source.forEach(function (file) {
//     console.log('     - ', file.name);
//   });

//   console.log('    Config files:');
//   files.config.forEach(function (file) {
//     console.log('     - ', file.name);
//   });

//   console.log('    Resource files:');
//   files.resource.forEach(function (file) {
//     console.log('     - ', file.name);
//   });
// }

// function findPodLib(pbxProject, projectName) {
//   var primeTarget = pbxProject.pbxTargetByName(projectName);
//   // console.log("primeTarget:");
//   // console.log(primeTarget);
//   //we need to find the build phase
//   let primeTargetBuildPhaseUUID;
//   let primeTargetBuildPhases = primeTarget.buildPhases;
//   for (let phase of primeTargetBuildPhases) {
//     if (phase.comment == 'Frameworks') {
//       primeTargetBuildPhaseUUID = phase.value;
//       break;
//     }
//   }

//   let libPodsFileEntry;

//   let libPodsName = 'libPods-' + projectName + '.a';

//   let section = pbxProject.hash.project.objects["PBXFrameworksBuildPhase"];

//   let sectionPrime = section[primeTargetBuildPhaseUUID];
//   if (sectionPrime.files) {
//     for (let file of sectionPrime.files) {
//       if (file.comment.indexOf(libPodsName) >= 0) {
//         libPodsFileEntry = file;
//         break;
//       }
//     }
//   };
//   return libPodsFileEntry;

// }

// function findFrameworkPhaseUUIDForTarget(target) {
//   //let frameworkPhaseUUID;
//   console.log("target: buildPhases:");
//   console.log(target.buildPhases);
//   if (target.buildPhases && target.buildPhases.length >= 0) {
//     for (let phase of target.buildPhases) {
//       if (phase.comment == "Frameworks") {
//         //frameworkPhaseUUID = phase.value;
//         return phase.value;
//       }
//     }
//   }

// }

// console.log('Adding target "' + PLUGIN_ID + '/ShareExtension" to XCode project');
//This is for testing only -tanli

// let textContext = {
//   opts: {
//     projectRoot: '/Users/tanli/private/projects/secucred/code/branches/devel_plugin/mobile/client'
//   }
// }

module.exports = function (context) {

  var Q = context.requireCordovaModule('q');
  var deferral = new Q.defer();

  if (context.opts.cordova.platforms.indexOf('ios') < 0) {
    log('You have to add the ios platform before adding this plugin!', 'error');
  }

  var configXml = fs.readFileSync(path.join(context.opts.projectRoot, 'config.xml'), 'utf-8');
  if (configXml) {
    configXml = configXml.substring(configXml.indexOf('<'));
  }

  findXCodeproject(context, function (projectFolder, projectName) {

    // console.log('  - Folder containing your iOS project: ' + iosFolder(context));


    // var pbxProjectPath = path.join(projectFolder, 'project.pbxproj');

    postProcessing(projectFolder, context, deferral);

  });
  // console.log("exit from iosAddTarget");
  // console.trace();

  // console.log("post process target");
  return deferral.promise;
};

function postProcessing(projectFolder, context, deferral, bundleID) {

  // console.log('  - Folder containing your iOS project: ' + iosFolder(context));

  var pbxProjectPath = path.join(projectFolder, 'project.pbxproj');

  var app_id;
  if (context) {
    // console.log("using native context to parse project");
    // // console.log(context);
    // console.log(context.cordova.platforms.ios);
    var config_xml = path.join(context.opts.projectRoot, 'config.xml');
    var et = context.requireCordovaModule('elementtree');

    var data = fs.readFileSync(config_xml).toString();
    var etree = et.parse(data);

    // console.log("app id is:");
    // console.log(etree.getroot().attrib.id);
    app_id = etree.getroot().attrib.id;
    var pbxProject = parsePbxProject(context, pbxProjectPath);
  } else {
    let xcode = require("xcode");
    // console.log("xcode:");
    // console.log(xcode);
    pbxProject = xcode.project(pbxProjectPath);
    pbxProject.parseSync();
    if (!bundleID){
      throw "Not in cordova context and bundle id is not given for testing purpose."
    }
    app_id= bundleID;
  }
  // console.log("check 2");
  // console.log("pbxProject:");
  // console.log(pbxProject);

  var target = pbxProject.pbxTargetByName('ShareExt');
  if (target) {
    console.log('    ShareExt target already exists.');
  }

  var configurations = pbxProject.pbxXCBuildConfigurationSection();
  for (var key in configurations) {

    if (typeof configurations[key].buildSettings !== 'undefined') {
      var buildSettingsObj = configurations[key].buildSettings;
      if (typeof buildSettingsObj['PRODUCT_NAME'] !== 'undefined') {
        // console.log("project name:");
        var productName = buildSettingsObj['PRODUCT_NAME'];
        // console.log(productName);

        // if (productName == projectName) {
        //   ld_paths = buildSettingsObj['LIBRARY_SEARCH_PATHS'];
        // }
        if (productName.indexOf('ShareExt') >= 0) {
          if (app_id){
            buildSettingsObj['PRODUCT_BUNDLE_IDENTIFIER'] = '"'+app_id+'.shareextension"';
          }
        }
      }
    }
  }

  fs.writeFileSync(pbxProjectPath, pbxProject.writeSync());
  /*
   * IMPORTANT:
   * We need to purge the project file cache stored by projectFile.js. Cordova-ios uses projectFile.js to read/write project file.
   * However, projectFile.js caches the project file in memory, i.e., its global variable. Prepare.js in cordova-ios globally replace
   * PRODUCT_BUNDLE_IDENTIFIER to the root project, which causes the extension's PRODUCT_BUNDLE_IDENTIFIER in the ios project file is also
   * set to that of the root project. This plugin resets the PRODUCT_BUNDLE_IDENTIFIER to app_id+.shareextension. We need to purge
   * projectFile.js so it will re-read the file between prepare.js and build.js, both of which are part of cordova-ios.
   */
  var projectFile = require('./../../../platforms/ios/cordova/lib/projectFile');

  let iosFolderDir = path.join(context.opts.projectRoot, 'platforms/ios');

  projectFile.purgeProjectFileCache(iosFolderDir);


  console.log('Post process to set PRODUCT_BUNDLE_IDENTIFIER for ShareExtension');

  if (deferral) {
    deferral.resolve();
  }
}

// textContext = {
//   opts: {
//     projectRoot: '/Users/tanli/private/projects/secucred/code/branches/devel_plugin/mobile/client'
//   }
// };


// postProcessing(textContext.opts.projectRoot+"/platforms/ios/SecuCred.xcodeproj");
