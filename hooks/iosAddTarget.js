//
//  iosAddTarget.js
//  This hook runs for the iOS platform when the plugin or platform is added.
//
// Source: https://github.com/DavidStrausz/cordova-plugin-today-widget
//

//
// The MIT License (MIT)
//
// Copyright (c) 2017 DavidStrausz
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
// var projectFile = require('./projectFile');

function redError(message) {
    return new Error('"' + PLUGIN_ID + '" \x1b[1m\x1b[31m' + message + '\x1b[0m');
}

function replacePreferencesInFile(filePath, preferences) {
    var content = fs.readFileSync(filePath, 'utf8');
    for (var i = 0; i < preferences.length; i++) {
        var pref = preferences[i];
        var regexp = new RegExp(pref.key, "g");
        content = content.replace(regexp, pref.value);
    }
    fs.writeFileSync(filePath, content);
}

function getAppId(context) {
  var config_xml = path.join(context.opts.projectRoot, 'config.xml');
  var et = context.requireCordovaModule('elementtree');

  var data = fs.readFileSync(config_xml).toString();
  var etree = et.parse(data);

  // console.log("app id is:");
  // console.log(etree.getroot().attrib.id);
  return etree.getroot().attrib.id;
}

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

function getPreferenceValue(configXml, name) {
  var value = configXml.match(new RegExp('name="' + name + '" value="(.*?)"', "i"));
  if (value && value[1]) {
    return value[1];
  } else {
    return null;
  }
}

function getCordovaParameter(configXml, variableName) {
  var variable;
  var arg = process.argv.filter(function (arg) {
    return arg.indexOf(variableName + '=') == 0;
  });
  if (arg.length >= 1) {
    variable = arg[0].split('=')[1];
  } else {
    variable = getPreferenceValue(configXml, variableName);
  }
  return variable;
}

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
  return pbxProject;
}

function forEachShareExtensionFile(context, callback) {
  var shareExtensionFolder = path.join(iosFolder(context), 'ShareExtension');
  fs.readdirSync(shareExtensionFolder).forEach(function (name) {
    // Ignore junk files like .DS_Store
    if (!/^\..*/.test(name)) {
      callback({
        name: name,
        path: path.join(shareExtensionFolder, name),
        extension: path.extname(name)
      });
    }
  });
}

function projectPlistPath(context, projectName) {
  return path.join(iosFolder(context), projectName, projectName + '-Info.plist');
}

function projectPlistJson(context, projectName) {
  var plist = require('plist');
  var path = projectPlistPath(context, projectName);
  return plist.parse(fs.readFileSync(path, 'utf8'));
}

function getPreferences(context, configXml, projectName) {
  var plist = projectPlistJson(context, projectName);
  let appID = getAppId(context);
  return [{
    key: '__DISPLAY_NAME__',
    value: getCordovaParameter(configXml, 'DISPLAY_NAME') || projectName
  }, {
    key: '__BUNDLE_IDENTIFIER__',
    //value: plist.CFBundleIdentifier + BUNDLE_SUFFIX
    value: appID+BUNDLE_SUFFIX
  }, {
    key: '__BUNDLE_SHORT_VERSION_STRING__',
    value: plist.CFBundleShortVersionString
  }, {
    key: '__BUNDLE_VERSION__',
    value: plist.CFBundleVersion
  }, {
    key: '__URL_SCHEME__',
    value: getCordovaParameter(configXml, 'IOS_URL_SCHEME')
  }, {
    key: '\\$\\(CFBundleIdentifier\\)',
    value: plist.CFBundleIdentifier
  }];
}

// Return the list of files in the share extension project, organized by type
var FILE_TYPES = {
  '.h': 'source',
  '.m': 'source',
  '.plist': 'config',
  '.entitlements': 'config',
};

function getShareExtensionFiles(context) {
  var files = {
    source: [],
    config: [],
    resource: []
  };
  forEachShareExtensionFile(context, function (file) {
    var fileType = FILE_TYPES[file.extension] || 'resource';
    files[fileType].push(file);
  });
  return files;
}

function longComment(file) {
  return file.basename + " in " + file.group;
}


function pbxBuildPhaseObj(file) {
  var obj = Object.create(null);

  obj.value = file.uuid;
  obj.comment = longComment(file);

  return obj;
}

function printShareExtensionFiles(files) {
  console.log('    Found following files in your ShareExtension folder:');
  console.log('    Source files:');
  files.source.forEach(function (file) {
    console.log('     - ', file.name);
  });

  console.log('    Config files:');
  files.config.forEach(function (file) {
    console.log('     - ', file.name);
  });

  console.log('    Resource files:');
  files.resource.forEach(function (file) {
    console.log('     - ', file.name);
  });
}

function findPodLib(pbxProject, projectName) {
  var primeTarget = pbxProject.pbxTargetByName(projectName);
  // console.log("primeTarget:");
  // console.log(primeTarget);
  //we need to find the build phase
  let primeTargetBuildPhaseUUID;
  let primeTargetBuildPhases = primeTarget.buildPhases;
  for (let phase of primeTargetBuildPhases) {
    if (phase.comment == 'Frameworks') {
      primeTargetBuildPhaseUUID = phase.value;
      break;
    }
  }

  let libPodsFileEntry;

  let libPodsName = 'libPods-' + projectName + '.a';

  let section = pbxProject.hash.project.objects["PBXFrameworksBuildPhase"];

  let sectionPrime = section[primeTargetBuildPhaseUUID];
  if (sectionPrime.files) {
    for (let file of sectionPrime.files) {
      if (file.comment.indexOf(libPodsName) >= 0) {
        libPodsFileEntry = file;
        break;
      }
    }
  };
  return libPodsFileEntry;

}

function findFrameworkPhaseUUIDForTarget(target) {
  //let frameworkPhaseUUID;
  // console.log("target: buildPhases:");
  // console.log(target.buildPhases);
  if (target.buildPhases && target.buildPhases.length >= 0) {
    for (let phase of target.buildPhases) {
      if (phase.comment == "Frameworks") {
        //frameworkPhaseUUID = phase.value;
        return phase.value;
      }
    }
  }

}

console.log('Adding target "' + PLUGIN_ID + '/ShareExtension" to XCode project');

module.exports = function (context) {

  var Q = context.requireCordovaModule('q');
  console.log("cordova q:");
  console.log(Q);
  var deferral = new Q.defer();

  if (context.opts.cordova.platforms.indexOf('ios') < 0) {
    log('You have to add the ios platform before adding this plugin!', 'error');
  }

  var configXml = fs.readFileSync(path.join(context.opts.projectRoot, 'config.xml'), 'utf-8');
  if (configXml) {
    configXml = configXml.substring(configXml.indexOf('<'));
  }

  findXCodeproject(context, function (projectFolder, projectName) {

    console.log('  - Folder containing your iOS project: ' + iosFolder(context));


    var pbxProjectPath = path.join(projectFolder, 'project.pbxproj');
    var pbxProject = parsePbxProject(context, pbxProjectPath);

    var files = getShareExtensionFiles(context);
    printShareExtensionFiles(files);

    var preferences = getPreferences(context, configXml, projectName);

    let filesToProcess = files.config.concat(files.source);
    filesToProcess.push({
      name: projectName + ".plist (debug)",
      path: iosFolder(context) + projectName + "/Entitlements-Debug.plist",
      extension: '.plist'
    });

    filesToProcess.push({
      name: projectName + ".plist (release)",
      path: iosFolder(context) + projectName + "/Entitlements-Release.plist",
      extension: '.plist'
    });

    filesToProcess.push({
      name: "ShareViewController.h (iOS Plugins)",
      path: iosFolder(context) + projectName + "/Plugins/cordova-plugin-shared/ShareViewController.h",
      extension: '.h'
    });

    // console.log("filesToProcess:");
    // console.log(filesToProcess);
    // files.config.concat(files.source).forEach(function (file) {
    //   replacePreferencesInFile(file.path, preferences);
    //   console.log('    Successfully updated ' + file.name);
    // });
    filesToProcess.forEach(function (file) {
      replacePreferencesInFile(file.path, preferences);
      console.log('    Successfully updated ' + file.name);
    });

    // console.log(files.config.concat(files.source));

    //last. we will create and update the extension file.
    // let myFile = {
    //   name: projectName + ".plist",
    //   path: iosFolder(context) + projectName + "/Entitlements-Debug.plist",
    //   extension: '.plist'
    // }
    // // console.log(myFile);
    // // console.log(typeof myFile.path);
    // replacePreferencesInFile(myFile.path, preferences);
    // console.log('    Successfully updated ' + myFile.name);

    // let myFile1 = {
    //   name: projectName + ".plist",
    //   path: iosFolder(context) + projectName + "/Entitlements-Release.plist",
    //   extension: '.plist'
    // }
    // // console.log(myFile1);
    // // console.log(typeof myFile1.path);
    // replacePreferencesInFile(myFile1.path, preferences);
    // console.log('    Successfully updated ' + myFile1.name);

    // let myFile2 = {
    //   name: "ShareViewController.h",
    //   path: iosFolder(context) + projectName + "/Plugins/cordova-plugin-shared/ShareViewController.h",
    //   extension: '.h'
    // }
    // // console.log(myFile2);
    // // console.log(typeof myFile2.path);
    // replacePreferencesInFile(myFile2.path, preferences);
    // console.log('    Successfully updated ' + myFile2.name);

    // Find if the project already contains the target and group
    var target = pbxProject.pbxTargetByName('ShareExt');
    if (target) {
      console.log('    ShareExt target already exists.');
    }

    // let frameworkBuildPhaseAdded;

    let frameworkBuildPhase;

    if (!target) {
      // Add PBXNativeTarget to the project
      target = pbxProject.addTarget('ShareExt', 'app_extension', 'ShareExtension');

      // console.log("new target created:");
      // console.log(target);

      // Add a new PBXSourcesBuildPhase for our ShareViewController
      // (we can't add it to the existing one because an extension is kind of an extra app)
      pbxProject.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', target.uuid);



      // Add a new PBXResourcesBuildPhase for the Resources used by the Share Extension
      // (MainInterface.storyboard)
      pbxProject.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
      frameworkBuildPhaseAdded = pbxProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);

      // console.log("framework load phase added:");
      // console.log(frameworkBuildPhaseAdded);
      frameworkBuildPhase = frameworkBuildPhaseAdded.buildPhase;
    } else {
      let frameworkPhaseUUID = findFrameworkPhaseUUIDForTarget(target);
      let section = pbxProject.hash.project.objects["PBXFrameworksBuildPhase"];

      frameworkBuildPhase = section[frameworkPhaseUUID];

    }

    /*
     * Add libPod to the framework (i.e. link) phase if libPod has been built and added to the main target (i.e. the project target).
     * This is to fix a problem with Phonegap's pushplugin in which an extension target is whipped out. When this plugin is run after push plugin, it will 
     * add the libPod to the extension target as well. -tanli
     */

    let libPodsFileEntry = findPodLib(pbxProject, projectName);

    if (libPodsFileEntry) {
      if (frameworkBuildPhase) {
        let podAlreadyExist = false;
        for (let file of frameworkBuildPhase.files) {
          // console.log("file:");
          // console.log(file);

          if (file.value == libPodsFileEntry.value) {
            podAlreadyExist = true;
            break;
          }
    }
        if (!podAlreadyExist) {
          // console.log("did not find existing entry: add one");
          frameworkBuildPhase.files.push(libPodsFileEntry);
        } else {
          console.log("libPod has already been added to the target. Skip.");

        }
      } else {
        console.log("Cannnot find framework build phase for Pod");
      }
    } else {
      console.log("Cannot libpod to add.");
    }


    // Create a separate PBXGroup for the shareExtensions files, name has to be unique and path must be in quotation marks
    var pbxGroupKey = pbxProject.findPBXGroupKey({
      name: 'ShareExtension'
    });
    if (pbxProject) {
      console.log('    ShareExtension group already exists.');
    }
    if (!pbxGroupKey) {
      pbxGroupKey = pbxProject.pbxCreateGroup('ShareExtension', 'ShareExtension');

      // Add the PbxGroup to cordovas "CustomTemplate"-group
      var customTemplateKey = pbxProject.findPBXGroupKey({
        name: 'CustomTemplate'
      });
      pbxProject.addToPbxGroup(pbxGroupKey, customTemplateKey);
    }

    // Add files which are not part of any build phase (config)
    files.config.forEach(function (file) {
      pbxProject.addFile(file.name, pbxGroupKey);
    });

    // Add source files to our PbxGroup and our newly created PBXSourcesBuildPhase
    files.source.forEach(function (file) {
      pbxProject.addSourceFile(file.name, {
        target: target.uuid
      }, pbxGroupKey);
    });

    //  Add the resource file and include it into the targest PbxResourcesBuildPhase and PbxGroup
    files.resource.forEach(function (file) {
      pbxProject.addResourceFile(file.name, {
        target: target.uuid
      }, pbxGroupKey);
    });

    // Add build settings for Swift support, bridging header and xcconfig files
    var configurations = pbxProject.pbxXCBuildConfigurationSection();
    // var target = pbxProject.pbxTargetByName("check");

    // console.log("pbxProject: configuration:");
    // console.log(configurations);
    let ld_paths;
    for (var key in configurations) {
      // console.log("key:")
      // console.log(key);

      if (typeof configurations[key].buildSettings !== 'undefined') {
        var buildSettingsObj = configurations[key].buildSettings;
        // console.log("buildSettingsObj:");
        // console.log(buildSettingsObj);
        if (typeof buildSettingsObj['PRODUCT_NAME'] !== 'undefined') {
          var productName = buildSettingsObj['PRODUCT_NAME'];
          if (productName == projectName) {
            // console.log("we find the build setting for the project itself:");
            ld_paths = buildSettingsObj['LIBRARY_SEARCH_PATHS'];
          }
          if (productName.indexOf('ShareExt') >= 0) {
            buildSettingsObj['LIBRARY_SEARCH_PATHS'] = ld_paths;
            buildSettingsObj['CODE_SIGN_ENTITLEMENTS'] = '"ShareExtension/ShareExtension.entitlements"';
            let param = getCordovaParameter(configXml, 'PROVISIONING_PROFILE');
            // console.log("check provision_profile");
            if (param && param !== null) {
              // console.log("check provision_profile: set");

            buildSettingsObj['PROVISIONING_PROFILE'] = getCordovaParameter(configXml, 'PROVISIONING_PROFILE');
            }
            // else {
            //   console.log("check provision_profile: skip");

            // }
            buildSettingsObj['DEVELOPMENT_TEAM'] = getCordovaParameter(configXml, 'DEVELOPMENT_TEAM');
            // console.log("new buildSettingsObj:");
            // console.log(buildSettingsObj);
          }
        }
      }
    }

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

  console.log("purge cached project file");
  projectFile.purgeProjectFileCache(iosFolderDir);
    // projectFile.purgeProjectFileCache(pbxProjectPath);

    // Write the modified project back to disc
    // let mypath="/Users/tanli/private/projects/secucred/code/branches/devel_stripe_connect/mobile/client/platforms/ios/project-tan.pbxproj"
    fs.writeFileSync(pbxProjectPath, pbxProject.writeSync());
    // console.log("check now: change mode:");
    // fs.chmodSync(pbxProjectPath, '400');
    // pbxProject.writeSync();
    // fs.writeFileSync("check_me.proj", pbxProject.writeSync());
    // console.log(pbxProjectPath);
    // // console.log(pbxProject.writeSync());
    console.log('Added ShareExtension to XCode project');
    // console.log("iosAddTarget.js");


    deferral.resolve();
  });

  return deferral.promise;
};
