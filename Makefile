SHELL := /bin/bash

COPY_DIRS=views,lists,shows,vendor
COPY_FILES=language validate_doc_update.js rewrites.json

HTML_FILES=template/index.html template/freeform.html template/readonlypost.html template/account.html
HTML_DEPS=.intermediate/_attachments/style/all.css .intermediate/_attachments/all.js
HTML_DEP_SUM_FILES=$(HTML_DEPS:.intermediate/%=.intermediate/%.sum)

IMAGE_FILES= \
	_attachments/style/Feed-icon.svg \
	_attachments/style/ornate_13.png \
	_attachments/img/glyphicons-halflings-white.png \
	_attachments/img/glyphicons-halflings.png
IMAGE_SUM_SRCS=$(IMAGE_FILES)
IMAGE_SUM_FILES=$(IMAGE_SUM_SRCS:%=.intermediate/%.sum)

BROWSERIFY_MODULES= \
	src/account-balance.js \
	src/account-input-table.js \
	src/account-posts.js \
	src/balances.js \
	src/calc.js \
	src/changes.js \
	src/complete_early_xhr.js \
	src/entry-buttons.js \
	src/freeform.js \
	src/instance-config.js \
	src/moment-config.js \
	src/post-editor.js \
	src/posts-table.js \
	src/recent.js \
	src/sheet.js \
	src/toMixedNumber.js \
	src/humanized-precise.js

SERVER_RENDERING_TRGS= \
	release/react/addons.js \
	release/infix/no_references.js \
	release/moment.js \
	release/browser-request.js \
	release/mustache.js \
	release/lib/views/lib/fractionParser.js \
	release/lib/views/lib/schemeNumber.js \
	release/lib/views/lib/biginteger.js \
	$(BROWSERIFY_MODULES:src/%=release/lib/%)

CSS_FILES=vendor/bootstrap/_attachments/css/bootstrap.css _attachments/style/local.css

FILES_FROM_COPY_DIRS=$(shell bash -c "find src/{$(COPY_DIRS)}")
TRGS_FROM_COPY_DIRS=$(FILES_FROM_COPY_DIRS:src/%=%)
SRCS=$(TRGS_FROM_COPY_DIRS) $(COPY_FILES)
TRGS=$(SRCS:%=release/%) $(HTML_FILES:%=release/%) release/sums.json $(SERVER_RENDERING_TRGS)

UGLIFYJS=./node_modules/.bin/uglifyjs -nc --screw-ie8 --unsafe
BROWSERIFY=./node_modules/.bin/browserify
MUSTACHE=./node_modules/.bin/mustache

sharebill.json: $(TRGS) release
	couchapp push --export release > sharebill.json

release: $(TRGS)

release/%: src/%
	mkdir -p `dirname $@`
	if [ ! -d $< ] ; then cp $< $@ ; fi

node_modules/react/dist/react-with-addons.min.js: node_modules
release/react/addons.js: node_modules/react/dist/react-with-addons.min.js
	mkdir -p `dirname $@`
	cp $< $@

node_modules/infix/no_references.js: node_modules
release/infix/no_references.js: node_modules/infix/no_references.js
	mkdir -p `dirname $@`
	$(BROWSERIFY) \
		-r infix/no_references \
		-s 'infix/no_references' \
		| $(UGLIFYJS) -o $@

release/moment.js: node_modules/moment/min/moment.min.js
	mkdir -p `dirname $@`
	cp $< $@

release/browser-request.js:
	mkdir -p `dirname $@`
	touch $@

node_modules/mustache/mustache.min.js: node_modules
release/mustache.js: node_modules/mustache/mustache.min.js
	mkdir -p `dirname $@`
	cp $< $@

release/lib/views/lib/%: src/views/lib/%
	mkdir -p `dirname $@`
	$(UGLIFYJS) -o $@ $<

release/lib/%.js: src/%.js
	mkdir -p `dirname $@`
	$(UGLIFYJS) -o $@ $<

clean:
	rm -rf sharebill.json release .intermediate

remake: clean sharebill.json

.PHONY: clean remake



.intermediate/%.sum: src/% ./checksumify.sh
	./checksumify.sh $<

.intermediate/%.sum: .intermediate/% ./checksumify.sh
	./checksumify.sh $<

.intermediate/image-sums.json: $(IMAGE_SUM_FILES) ./collect_checksums.sh
	./collect_checksums.sh $(IMAGE_SUM_FILES) > $@


release/sums.json: $(HTML_DEP_SUM_FILES) ./collect_checksums.sh
	./collect_checksums.sh $(HTML_DEP_SUM_FILES) > $@


release/%.html: src/%.mu.html
	mkdir -p `dirname $@`
	cp $< $@


.intermediate/_attachments/all.js: .intermediate/all.min.js
	mkdir -p `dirname $@`
	cp $< $@

.intermediate/%.min.js: src/%.js
	mkdir -p `dirname $@`
	$(UGLIFYJS) -o $@ $<

.intermediate/%.min.js: .intermediate/%.js
	mkdir -p `dirname $@`
	$(UGLIFYJS) -o $@ $<


.intermediate/_attachments/style/all.css: .intermediate/_attachments/style/all-prestache.css .intermediate/image-sums.json node_modules
	$(MUSTACHE) .intermediate/image-sums.json <(sed -e 's/glyphicons-halflings.png/glyphicons-halflings.sum-{{glyphicons-halflings_png}}.png/' -e 's/glyphicons-halflings-white.png/glyphicons-halflings-white.sum-{{glyphicons-halflings-white_png}}.png/' .intermediate/_attachments/style/all-prestache.css) > $@

.intermediate/_attachments/style/all-prestache.css: $(CSS_FILES:%=src/%)
	mkdir -p `dirname $@`
	cat $(CSS_FILES:%=src/%) > $@

node_modules: package.json
	npm install
	touch node_modules

.intermediate/all.js: $(BROWSERIFY_MODULES) node_modules
	$(BROWSERIFY) \
		-r './src/account-balance:./account-balance' \
		-r './src/account-posts:./account-posts' \
		-r './src/balances:./balances' \
		-r './src/entry-buttons:./entry-buttons' \
		-r './src/instance-config:./instance-config' \
		-r './src/post-editor:./post-editor' \
		-r './src/recent:./recent' \
		-r './src/changes:./changes' \
		-r 'react' \
		src/moment-config.js \
		-o $@
