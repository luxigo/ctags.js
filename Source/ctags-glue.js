var CTagsJSGlue = {

    $ctagsJS__postset: 'Module["CTags_getLanguage"] = ctagsJS.getLanguage;' +
                       'Module["CTags_parseFile"] = ctagsJS.parseSourceFile;' +
                       'Module["CTags_setOnParsingCompleted"] = ctagsJS.setOnParsingCompleted;' +
                       'Module["CTags_setOnTagEntry"] = ctagsJS.setOnTagEntry;',

    $ctagsJS: {
        onTagEntry: null,
        onParsingCompleted: null,
        regex: {},

        getLanguage : function(url) {
            var urlPtr = allocate(intArrayFromString(url), 'i8', ALLOC_STACK);
            var langPtr = Module['_getLanguage'](urlPtr);
            return Pointer_stringify(langPtr);
        },

        parseSourceFile : function(url) {
            var path = url.substr(0, url.lastIndexOf("/"));
            Module["FS_createPath"]("/", path, true, true);

            var urlPtr = allocate(intArrayFromString(url), 'i8', ALLOC_STACK);
            Module['_parseURL'](urlPtr);
        },

        setOnTagEntry : function(func) {
            ctagsJS.onTagEntry = func;
        },

        setOnParsingCompleted : function(func) {
            ctagsJS.onParsingCompleted = func;
        },

        // Returns a Javascript string stored in a C pointer.
        // We can't use `Pointer_stringify` because we might match ASCII characters greater 127
        getASCIIString : function(pointer) {
            var asciiString = '';
            var i = 0;
            var charCode;
            while (charCode = {{{ makeGetValue('pointer', 'i', 'i8', 0, 1) }}}) {
                asciiString += String.fromCharCode(charCode);
                i++;
            }
            return asciiString;
        },
    },

    pushTagEntry : function(name, kind, lineNumber, sourceFile, language) {
        if (ctagsJS.onTagEntry)
            ctagsJS.onTagEntry(
                Pointer_stringify(name),
                Pointer_stringify(kind),
                lineNumber,
                Pointer_stringify(sourceFile),
                Pointer_stringify(language));
    },

    parsingCompleted : function(sourceFile) {
        if (ctagsJS.onParsingCompleted)
            ctagsJS.onParsingCompleted(Pointer_stringify(sourceFile));
    },

    regcomp : function(preg, patternPtr, cflags) {
        var flags = '';
        if (cflags & 2) flags += 'i';

        var pattern = ctagsJS.getASCIIString(patternPtr);
        ctagsJS.regex[preg] = new RegExp(pattern, flags);
        
        return 0;
    },
    
    regexec : function(preg, stringPtr, nmatch, pmatch, eflags) {
        var string = ctagsJS.getASCIIString(stringPtr);
        var regex = ctagsJS.regex[preg];

        var results = regex.exec(string);

        for (var i = 0; i < nmatch; i++) {

            var rm_so = -1;
            var rm_eo = -1;
            
            if (results && i < results.length) {
                rm_so = string.indexOf(results[i]);
                rm_eo = rm_so + results[i].length;
            }

            {{{ makeSetValue('pmatch', '8*i', 'rm_so', 'i32') }}};
            {{{ makeSetValue('pmatch', '8*i+4', 'rm_eo', 'i32') }}};
        };

        return (results ? 0 : 1); //REG_NOMATCH
    }
};

autoAddDeps(CTagsJSGlue, '$ctagsJS');
mergeInto(LibraryManager.library, CTagsJSGlue);
