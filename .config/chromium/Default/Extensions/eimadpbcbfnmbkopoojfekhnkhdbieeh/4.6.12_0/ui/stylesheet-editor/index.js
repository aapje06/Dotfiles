(function () {
    'use strict';

    /* malevic@0.11.6 - Mar 6, 2018 */
    function classes(...args) {
        const classes = [];
        args.filter((c) => Boolean(c))
            .forEach((c) => {
            if (typeof c === 'string') {
                classes.push(c);
            }
            else if (typeof c === 'object') {
                classes.push(...Object.keys(c)
                    .filter((key) => Boolean(c[key])));
            }
        });
        return classes.join(' ');
    }
    function styles(declarations) {
        return Object.keys(declarations)
            .filter((cssProp) => declarations[cssProp] != null)
            .map((cssProp) => `${cssProp}: ${declarations[cssProp]};`)
            .join(' ');
    }
    function isObject(value) {
        return typeof value === 'object' && value != null;
    }
    function toArray(obj) {
        return Array.prototype.slice.call(obj);
    }
    function flatten(arr) {
        return arr.reduce((flat, toFlatten) => {
            return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
        }, []);
    }
    function isEmptyDeclaration(d) {
        return d == null || d === '';
    }
    function flattenDeclarations(declarations, funcExecutor) {
        const results = [];
        flatten(declarations)
            .forEach((c) => {
            if (typeof c === 'function') {
                const r = funcExecutor(c);
                if (Array.isArray(r)) {
                    results.push(...flatten(r).filter(x => !isEmptyDeclaration(x)));
                }
                else if (!isEmptyDeclaration(r)) {
                    results.push(r);
                }
            }
            else if (!isEmptyDeclaration(c)) {
                results.push(c);
            }
        });
        return results;
    }

    function html(tagOrComponent, attrs, ...children) {
        if (typeof tagOrComponent === 'string') {
            return { tag: tagOrComponent, attrs, children };
        }
        if (typeof tagOrComponent === 'function') {
            return tagOrComponent(attrs == null ? undefined : attrs, ...flatten(children));
        }
        return null;
    }

    const dataBindings = new WeakMap();
    function setData(element, data) {
        dataBindings.set(element, data);
    }
    function getData(element) {
        return dataBindings.get(element);
    }

    const eventListeners = new WeakMap();
    function addListener(element, event, listener) {
        let listeners;
        if (eventListeners.has(element)) {
            listeners = eventListeners.get(element);
        }
        else {
            listeners = {};
            eventListeners.set(element, listeners);
        }
        if (listeners[event] !== listener) {
            if (event in listeners) {
                element.removeEventListener(event, listeners[event]);
            }
            element.addEventListener(event, listener);
            listeners[event] = listener;
        }
    }
    function removeListener(element, event) {
        let listeners;
        if (eventListeners.has(element)) {
            listeners = eventListeners.get(element);
        }
        else {
            return;
        }
        if (event in listeners) {
            element.removeEventListener(event, listeners[event]);
            delete listeners[event];
        }
    }

    function createPlugins() {
        const plugins = [];
        return {
            add(plugin) {
                plugins.push(plugin);
                return this;
            },
            apply(props) {
                let result;
                let plugin;
                for (let i = plugins.length - 1; i >= 0; i--) {
                    plugin = plugins[i];
                    result = plugin(props);
                    if (result != null) {
                        return result;
                    }
                }
                return null;
            }
        };
    }

    const nativeContainers = new WeakMap();
    const mountedElements = new WeakMap();
    const didMountHandlers = new WeakMap();
    const didUpdateHandlers = new WeakMap();
    const willUnmountHandlers = new WeakMap();
    const lifecycleHandlers = {
        'didmount': didMountHandlers,
        'didupdate': didUpdateHandlers,
        'willunmount': willUnmountHandlers
    };
    const XHTML_NS = 'http://www.w3.org/1999/xhtml';
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const pluginsCreateNode = createPlugins()
        .add(({ d, parent }) => {
        if (!isObject(d)) {
            return document.createTextNode(d == null ? '' : String(d));
        }
        if (d.tag === 'svg') {
            return document.createElementNS(SVG_NS, 'svg');
        }
        if (parent.namespaceURI === XHTML_NS) {
            return document.createElement(d.tag);
        }
        return document.createElementNS(parent.namespaceURI, d.tag);
    });
    const pluginsMountNode = createPlugins()
        .add(({ node, parent, next }) => {
        parent.insertBefore(node, next);
        return true;
    });
    const pluginsUnmountNode = createPlugins()
        .add(({ node, parent }) => {
        parent.removeChild(node);
        return true;
    });
    const pluginsSetAttribute = createPlugins()
        .add(({ element, attr, value }) => {
        if (value == null || value === false) {
            element.removeAttribute(attr);
        }
        else {
            element.setAttribute(attr, value === true ? '' : String(value));
        }
        return true;
    })
        .add(({ element, attr, value }) => {
        if (attr.indexOf('on') === 0) {
            const event = attr.substring(2);
            if (typeof value === 'function') {
                addListener(element, event, value);
            }
            else {
                removeListener(element, event);
            }
            return true;
        }
        return null;
    })
        .add(({ element, attr, value }) => {
        if (attr === 'native') {
            if (value === true) {
                nativeContainers.set(element, true);
            }
            else {
                nativeContainers.delete(element);
            }
            return true;
        }
        if (attr in lifecycleHandlers) {
            const handlers = lifecycleHandlers[attr];
            if (value) {
                handlers.set(element, value);
            }
            else {
                handlers.delete(element);
            }
            return true;
        }
        return null;
    })
        .add(({ element, attr, value }) => {
        if (attr === 'data') {
            setData(element, value);
            return true;
        }
        return null;
    })
        .add(({ element, attr, value }) => {
        if (attr === 'class' && isObject(value)) {
            let cls;
            if (Array.isArray(value)) {
                cls = classes(...value);
            }
            else {
                cls = classes(value);
            }
            if (cls) {
                element.setAttribute('class', cls);
            }
            else {
                element.removeAttribute('class');
            }
            return true;
        }
        return null;
    })
        .add(({ element, attr, value }) => {
        if (attr === 'style' && isObject(value)) {
            const style = styles(value);
            if (style) {
                element.setAttribute('style', style);
            }
            else {
                element.removeAttribute('style');
            }
            return true;
        }
        return null;
    });
    const elementsAttrs = new WeakMap();
    function getAttrs(element) {
        return elementsAttrs.get(element) || null;
    }
    function createNode(d, parent, next) {
        const node = pluginsCreateNode.apply({ d, parent });
        if (isObject(d)) {
            const element = node;
            const elementAttrs = {};
            elementsAttrs.set(element, elementAttrs);
            if (d.attrs) {
                Object.keys(d.attrs).forEach((attr) => {
                    const value = d.attrs[attr];
                    pluginsSetAttribute.apply({ element, attr, value });
                    elementAttrs[attr] = value;
                });
            }
        }
        pluginsMountNode.apply({ node, parent, next });
        if (node instanceof Element && didMountHandlers.has(node)) {
            didMountHandlers.get(node)(node);
            mountedElements.set(node, true);
        }
        if (isObject(d) && node instanceof Element && !nativeContainers.has(node)) {
            syncChildNodes(d, node);
        }
        return node;
    }
    function collectAttrs(element) {
        return toArray(element.attributes)
            .reduce((obj, { name, value }) => {
            obj[name] = value;
            return obj;
        }, {});
    }
    function syncNode(d, existing) {
        if (isObject(d)) {
            const element = existing;
            const attrs = d.attrs || {};
            let existingAttrs = getAttrs(element);
            if (!existingAttrs) {
                existingAttrs = collectAttrs(element);
                elementsAttrs.set(element, existingAttrs);
            }
            Object.keys(existingAttrs).forEach((attr) => {
                if (!(attr in attrs)) {
                    pluginsSetAttribute.apply({ element, attr, value: null });
                    delete existingAttrs[attr];
                }
            });
            Object.keys(attrs).forEach((attr) => {
                const value = attrs[attr];
                if (existingAttrs[attr] !== value) {
                    pluginsSetAttribute.apply({ element, attr, value });
                    existingAttrs[attr] = value;
                }
            });
            if (didMountHandlers.has(element) && !mountedElements.has(element)) {
                didMountHandlers.get(element)(element);
                mountedElements.set(element, true);
            }
            else if (didUpdateHandlers.has(element)) {
                didUpdateHandlers.get(element)(element);
            }
            if (!nativeContainers.has(element)) {
                syncChildNodes(d, element);
            }
        }
        else {
            existing.textContent = d == null ? '' : String(d);
        }
    }
    function removeNode(node, parent) {
        if (node instanceof Element && willUnmountHandlers.has(node)) {
            willUnmountHandlers.get(node)(node);
        }
        pluginsUnmountNode.apply({ node, parent });
    }
    const pluginsMatchNodes = createPlugins()
        .add(({ d, element }) => {
        const matches = [];
        const declarations = Array.isArray(d.children) ? flattenDeclarations(d.children, (fn) => fn(element)) : [];
        let nodeIndex = 0;
        declarations.forEach((d) => {
            const isElement = isObject(d);
            const isText = !isElement;
            let found = null;
            let node = null;
            for (; nodeIndex < element.childNodes.length; nodeIndex++) {
                node = element.childNodes.item(nodeIndex);
                if (isText) {
                    if (node instanceof Element) {
                        break;
                    }
                    if (node instanceof Text) {
                        found = node;
                        nodeIndex++;
                        break;
                    }
                }
                if (isElement && node instanceof Element) {
                    if (node.tagName.toLowerCase() === d.tag) {
                        found = node;
                    }
                    nodeIndex++;
                    break;
                }
            }
            matches.push([d, found]);
        });
        return matches;
    });
    function commit(matches, element) {
        const matchedNodes = new Set();
        matches.map(([, node]) => node)
            .filter((node) => node)
            .forEach((node) => matchedNodes.add(node));
        toArray(element.childNodes)
            .filter((node) => !matchedNodes.has(node))
            .forEach((node) => removeNode(node, element));
        let prevNode = null;
        matches.forEach(([d, node], i) => {
            if (node) {
                syncNode(d, node);
                prevNode = node;
            }
            else {
                const nextSibling = (prevNode ?
                    prevNode.nextSibling :
                    (i === 0 ? element.firstChild : null));
                prevNode = createNode(d, element, nextSibling);
            }
        });
    }
    function syncChildNodes(d, element) {
        const matches = pluginsMatchNodes.apply({ d, element });
        commit(matches, element);
    }
    function render(target, declaration) {
        if (!(target instanceof Element)) {
            throw new Error('Wrong rendering target');
        }
        const temp = {
            tag: target.tagName.toLowerCase(),
            attrs: collectAttrs(target),
            children: Array.isArray(declaration) ? declaration : [declaration]
        };
        syncChildNodes(temp, target);
        return Array.isArray(declaration) ?
            toArray(target.childNodes) :
            isObject(declaration) ?
                target.firstElementChild :
                target.firstChild;
    }
    function sync(target, declarationOrFn) {
        const declaration = typeof declarationOrFn === 'function' ? declarationOrFn(target.parentElement) : declarationOrFn;
        const isElement = isObject(declaration);
        if (!((!isElement && target instanceof Text) ||
            (isElement && target instanceof Element && target.tagName.toLowerCase() === declaration.tag))) {
            throw new Error('Wrong sync target');
        }
        syncNode(declaration, target);
        return target;
    }

    const pluginsIsVoidTag = createPlugins()
        .add((tag) => tag in VOID_TAGS);
    const pluginsSkipAttr = createPlugins()
        .add(({ value }) => (value == null || value === false))
        .add(({ attr }) => (([
        'data',
        'native',
        'didmount',
        'didupdate',
        'willunmount',
    ].indexOf(attr) >= 0 ||
        attr.indexOf('on') === 0) ? true : null));
    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    const pluginsStringifyAttr = createPlugins()
        .add(({ value }) => value === true ? '' : escapeHtml(value))
        .add(({ attr, value }) => {
        if (attr === 'class' && isObject(value)) {
            let cls;
            if (Array.isArray(value)) {
                cls = classes(...value);
            }
            else {
                cls = classes(value);
            }
            return escapeHtml(cls);
        }
        return null;
    })
        .add(({ attr, value }) => {
        if (attr === 'style' && isObject(value)) {
            return escapeHtml(styles(value));
        }
        return null;
    });
    const pluginsProcessText = createPlugins()
        .add((text) => escapeHtml(text));
    const VOID_TAGS = [
        'area',
        'base',
        'basefont',
        'bgsound',
        'br',
        'col',
        'command',
        'embed',
        'frame',
        'hr',
        'img',
        'image',
        'input',
        'isindex',
        'keygen',
        'link',
        'menuitem',
        'meta',
        'nextid',
        'param',
        'source',
        'track',
        'wbr',
        'circle',
        'ellipse',
        'image',
        'line',
        'path',
        'polygon',
        'rect',
    ].reduce((map, tag) => (map[tag] = true, map), {});

    const plugins = {
        render: {
            createNode: pluginsCreateNode,
            matchNodes: pluginsMatchNodes,
            mountNode: pluginsMountNode,
            setAttribute: pluginsSetAttribute,
            unmountNode: pluginsUnmountNode,
        },
        static: {
            isVoidTag: pluginsIsVoidTag,
            processText: pluginsProcessText,
            skipAttr: pluginsSkipAttr,
            stringifyAttr: pluginsStringifyAttr,
        }
    };

    function toArray$1(x) {
        return Array.isArray(x) ? x : [x];
    }
    function mergeClass(cls, propsCls) {
        const normalized = toArray$1(cls).concat(toArray$1(propsCls));
        return classes(...normalized);
    }
    function omitAttrs(omit, attrs) {
        const result = {};
        Object.keys(attrs).forEach((key) => {
            if (omit.indexOf(key) < 0) {
                result[key] = attrs[key];
            }
        });
        return result;
    }

    function Button(props = {}, ...children) {
        const cls = mergeClass('button', props.class);
        const attrs = omitAttrs(['class'], props);
        return (html("button", Object.assign({ class: cls }, attrs),
            html("span", { class: "button__wrapper" }, children)));
    }

    /* malevic@0.11.6 - Mar 6, 2018 */

    plugins.render.matchNodes.add(({ d, element }) => {
        if (!(d.attrs && d.attrs.data === VirtualScroll)) {
            return null;
        }
        const elements = Array.from(element.children);
        const elementsByIndex = elements.reduce((map, el) => map.set(getData(el), el), new Map());
        const declarations = d.children[0](element);
        return declarations.map((c) => [c, elementsByIndex.get(c.attrs.data) || null]);
    });
    const elementsHeights = new WeakMap();
    function VirtualScroll(props) {
        if (props.items.length === 0) {
            return props.root;
        }
        function getContent({ scrollToIndex }) {
            return (root) => {
                let itemHeight;
                if (elementsHeights.has(root)) {
                    itemHeight = elementsHeights.get(root);
                }
                else {
                    const tempItem = {
                        ...props.items[0],
                        attrs: {
                            ...props.items[0].attrs,
                            didmount: null,
                            didupdate: null
                        }
                    };
                    const tempNode = render(root, tempItem);
                    itemHeight = tempNode.getBoundingClientRect().height;
                    elementsHeights.set(root, itemHeight);
                }
                return (html("div", { data: VirtualScroll, style: {
                        'flex': 'none',
                        'height': `${props.items.length * itemHeight}px`,
                        'overflow': 'hidden',
                        'position': 'relative',
                    } }, (wrapper) => {
                    if (scrollToIndex >= 0) {
                        root.scrollTop = scrollToIndex * itemHeight;
                    }
                    const containerHeight = document.documentElement.clientHeight - root.getBoundingClientRect().top;
                    let focusedIndex = -1;
                    if (document.activeElement) {
                        let current = document.activeElement;
                        while (current && current.parentElement !== wrapper) {
                            current = current.parentElement;
                        }
                        if (current) {
                            focusedIndex = getData(current);
                        }
                    }
                    return props.items
                        .map((item, index) => {
                        return { item, index };
                    })
                        .filter(({ item, index }) => {
                        const eTop = index * itemHeight;
                        const eBottom = (index + 1) * itemHeight;
                        const rTop = root.scrollTop;
                        const rBottom = root.scrollTop + containerHeight;
                        const isTopBoundVisible = eTop >= rTop && eTop <= rBottom;
                        const isBottomBoundVisible = eBottom >= rTop && eBottom <= rBottom;
                        return isTopBoundVisible || isBottomBoundVisible || focusedIndex === index;
                    })
                        .map(({ item, index }) => (html("div", { data: index, style: {
                            'left': '0',
                            'position': 'absolute',
                            'top': `${index * itemHeight}px`,
                            'width': '100%',
                        } }, item)));
                }));
            };
        }
        let rootNode;
        let prevScrollTop;
        const rootDidMount = props.root.attrs && props.root.attrs.didmount;
        const rootDidUpdate = props.root.attrs && props.root.attrs.didupdate;
        return {
            ...props.root,
            attrs: {
                ...props.root.attrs,
                didmount: (node) => {
                    rootNode = node;
                    rootDidMount && rootDidMount(rootNode);
                },
                didupdate: (node) => {
                    rootNode = node;
                    rootDidUpdate && rootDidUpdate(rootNode);
                },
                onscroll: (e) => {
                    if (rootNode.scrollTop === prevScrollTop) {
                        return;
                    }
                    prevScrollTop = rootNode.scrollTop;
                    render(rootNode, getContent({ scrollToIndex: -1 }));
                }
            },
            children: [getContent({ scrollToIndex: isNaN(props.scrollToIndex) ? -1 : props.scrollToIndex })]
        };
    }

    function getURLHost(url) {
        return url.match(/^(.*?:\/{2,3})?(.+?)(\/|$)/)[2];
    }
    function isURLInList(url, list) {
        for (let i = 0; i < list.length; i++) {
            if (isURLMatched(url, list[i])) {
                return true;
            }
        }
        return false;
    }
    function isURLMatched(url, urlTemplate) {
        const regex = createUrlRegex(urlTemplate);
        return Boolean(url.match(regex));
    }
    function createUrlRegex(urlTemplate) {
        urlTemplate = urlTemplate.trim();
        const exactBeginning = (urlTemplate[0] === '^');
        const exactEnding = (urlTemplate[urlTemplate.length - 1] === '$');
        urlTemplate = (urlTemplate
            .replace(/^\^/, '')
            .replace(/\$$/, '')
            .replace(/^.*?\/{2,3}/, '')
            .replace(/\?.*$/, '')
            .replace(/\/$/, ''));
        let slashIndex;
        let beforeSlash;
        let afterSlash;
        if ((slashIndex = urlTemplate.indexOf('/')) >= 0) {
            beforeSlash = urlTemplate.substring(0, slashIndex);
            afterSlash = urlTemplate.replace('$', '').substring(slashIndex);
        }
        else {
            beforeSlash = urlTemplate.replace('$', '');
        }
        let result = (exactBeginning ?
            '^(.*?\\:\\/{2,3})?'
            : '^(.*?\\:\\/{2,3})?([^\/]*?\\.)?');
        const hostParts = beforeSlash.split('.');
        result += '(';
        for (let i = 0; i < hostParts.length; i++) {
            if (hostParts[i] === '*') {
                hostParts[i] = '[^\\.\\/]+?';
            }
        }
        result += hostParts.join('\\.');
        result += ')';
        if (afterSlash) {
            result += '(';
            result += afterSlash.replace('/', '\\/');
            result += ')';
        }
        result += (exactEnding ?
            '(\\/?(\\?[^\/]*?)?)$'
            : '(\\/?.*?)$');
        return new RegExp(result, 'i');
    }

    function Body({ data, tab, actions }) {
        const host = getURLHost(tab.url);
        const custom = data.settings.customThemes.find(({ url }) => isURLInList(tab.url, url));
        let textNode;
        const placeholderText = [
            '* {',
            '    background-color: #234 !important',
            '    color: #cba !important',
            '}',
        ].join('\n');
        function onTextRender(node) {
            textNode = node;
            textNode.value = (custom ? custom.theme.stylesheet : data.settings.theme.stylesheet) || '';
            if (document.activeElement !== textNode) {
                textNode.focus();
            }
        }
        function applyStyleSheet(css) {
            if (custom) {
                custom.theme = { ...custom.theme, ...{ stylesheet: css } };
                actions.changeSettings({ customThemes: data.settings.customThemes });
            }
            else {
                actions.setTheme({ stylesheet: css });
            }
        }
        function reset() {
            applyStyleSheet('');
        }
        function apply() {
            const css = textNode.value;
            applyStyleSheet(css);
        }
        return (html("body", null,
            html("header", null,
                html("img", { id: "logo", src: "../assets/images/darkreader-type.svg", alt: "Dark Reader" }),
                html("h1", { id: "title" }, "CSS Editor")),
            html("h3", { id: "sub-title" }, custom ? host : 'All websites'),
            html("textarea", { id: "editor", native: true, placeholder: placeholderText, didmount: onTextRender, didupdate: onTextRender }),
            html("div", { id: "buttons" },
                html(Button, { onclick: reset }, "Reset"),
                html(Button, { onclick: apply }, "Apply"))));
    }

    class Connector {
        constructor() {
            this.counter = 0;
            this.port = chrome.runtime.connect({ name: 'ui' });
        }
        getRequestId() {
            return ++this.counter;
        }
        sendRequest(request, executor) {
            const id = this.getRequestId();
            return new Promise((resolve, reject) => {
                const listener = ({ id: responseId, ...response }) => {
                    if (responseId === id) {
                        executor(response, resolve, reject);
                        this.port.onMessage.removeListener(listener);
                    }
                };
                this.port.onMessage.addListener(listener);
                this.port.postMessage({ ...request, id });
            });
        }
        getData() {
            return this.sendRequest({ type: 'get-data' }, ({ data }, resolve) => resolve(data));
        }
        getActiveTabInfo() {
            return this.sendRequest({ type: 'get-active-tab-info' }, ({ data }, resolve) => resolve(data));
        }
        subscribeToChanges(callback) {
            const id = this.getRequestId();
            this.port.onMessage.addListener(({ id: responseId, data }) => {
                if (responseId === id) {
                    callback(data);
                }
            });
            this.port.postMessage({ type: 'subscribe-to-changes', id });
        }
        enable() {
            this.port.postMessage({ type: 'enable' });
        }
        disable() {
            this.port.postMessage({ type: 'disable' });
        }
        setShortcut(command, shortcut) {
            this.port.postMessage({ type: 'set-shortcut', data: { command, shortcut } });
        }
        changeSettings(settings) {
            this.port.postMessage({ type: 'change-settings', data: settings });
        }
        setTheme(theme) {
            this.port.postMessage({ type: 'set-theme', data: theme });
        }
        toggleSitePattern(pattern) {
            this.port.postMessage({ type: 'toggle-site-pattern', data: pattern });
        }
        markNewsAsRead(ids) {
            this.port.postMessage({ type: 'mark-news-as-read', data: ids });
        }
        applyDevDynamicThemeFixes(text) {
            return this.sendRequest({ type: 'apply-dev-dynamic-theme-fixes', data: text }, ({ error }, resolve, reject) => error ? reject(error) : resolve());
        }
        resetDevDynamicThemeFixes() {
            this.port.postMessage({ type: 'reset-dev-dynamic-theme-fixes' });
        }
        applyDevInversionFixes(text) {
            return this.sendRequest({ type: 'apply-dev-inversion-fixes', data: text }, ({ error }, resolve, reject) => error ? reject(error) : resolve());
        }
        resetDevInversionFixes() {
            this.port.postMessage({ type: 'reset-dev-inversion-fixes' });
        }
        applyDevStaticThemes(text) {
            return this.sendRequest({ type: 'apply-dev-static-themes', data: text }, ({ error }, resolve, reject) => error ? reject(error) : resolve());
        }
        resetDevStaticThemes() {
            this.port.postMessage({ type: 'reset-dev-static-themes' });
        }
        disconnect() {
            this.port.disconnect();
        }
    }

    function getMockData(override = {}) {
        return Object.assign({
            isEnabled: true,
            isReady: true,
            settings: {
                enabled: true,
                theme: {
                    mode: 1,
                    brightness: 110,
                    contrast: 90,
                    grayscale: 20,
                    sepia: 10,
                    useFont: false,
                    fontFamily: 'Segoe UI',
                    textStroke: 0,
                    engine: 'cssFilter',
                    stylesheet: '',
                },
                customThemes: [],
                siteList: [],
                applyToListedOnly: false,
                changeBrowserTheme: false,
                activationTime: '18:00',
                deactivationTime: '9:00',
                notifyOfNews: false,
                syncSettings: true,
            },
            fonts: [
                'serif',
                'sans-serif',
                'monospace',
                'cursive',
                'fantasy',
                'system-ui'
            ],
            news: [],
            shortcuts: {
                'addSite': 'Alt+Shift+A',
                'toggle': 'Alt+Shift+D'
            },
            devDynamicThemeFixesText: '',
            devInversionFixesText: '',
            devStaticThemesText: '',
        }, override);
    }
    function getMockActiveTabInfo() {
        return {
            url: 'https://darkreader.org/',
            isProtected: false,
            isInDarkList: false,
        };
    }
    function createConnectorMock() {
        let listener = null;
        const data = getMockData();
        const tab = getMockActiveTabInfo();
        const connector = {
            getData() {
                return Promise.resolve(data);
            },
            getActiveTabInfo() {
                return Promise.resolve(tab);
            },
            subscribeToChanges(callback) {
                listener = callback;
            },
            changeSettings(settings) {
                Object.assign(data.settings, settings);
                listener(data);
            },
            setTheme(theme) {
                Object.assign(data.settings.theme, theme);
                listener(data);
            },
            setShortcut(command, shortcut) {
                Object.assign(data.shortcuts, { [command]: shortcut });
                listener(data);
            },
            toggleSitePattern(pattern) {
                const index = data.settings.siteList.indexOf(pattern);
                if (index >= 0) {
                    data.settings.siteList.splice(pattern, 1);
                }
                else {
                    data.settings.siteList.push(pattern);
                }
                listener(data);
            },
            markNewsAsRead(ids) {
            },
            disconnect() {
            },
        };
        return connector;
    }

    function connect() {
        if (typeof chrome === 'undefined' || !chrome.extension) {
            return createConnectorMock();
        }
        return new Connector();
    }

    function renderBody(data, tab, actions) {
        sync(document.body, html(Body, { data: data, tab: tab, actions: actions }));
    }
    async function start() {
        const connector = connect();
        window.addEventListener('unload', (e) => connector.disconnect());
        const data = await connector.getData();
        const tab = await connector.getActiveTabInfo();
        renderBody(data, tab, connector);
        connector.subscribeToChanges((data) => renderBody(data, tab, connector));
    }
    start();

}());
