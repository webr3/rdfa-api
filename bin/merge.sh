cat ../source/core.js ../source/rdfselector.js ../source/parsers.js ../source/serializers.js ../source/filters.js ../source/extensions.js ../source/hash.js ../source/compat.js ../source/loader.js > ../api.js
java -jar ../../yui.jar ../api.js > ../api.min.js
