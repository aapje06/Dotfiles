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

    /* malevic@0.11.6 - Mar 6, 2018 */

    let registered = false;
    function withForms() {
        if (registered) {
            return;
        }
        registered = true;
        plugins.render.setAttribute
            .add(({ element, attr, value }) => {
            if (attr === 'value' && element instanceof HTMLInputElement) {
                const text = value == null ? '' : String(value);
                if (element.hasAttribute('value')) {
                    element.value = text;
                }
                else {
                    element.setAttribute('value', text);
                }
                return true;
            }
            return null;
        });
        plugins.render.createNode
            .add(({ d, parent }) => {
            if ((d == null || typeof d !== 'object') && parent instanceof HTMLTextAreaElement) {
                const text = d;
                const value = text == null ? '' : String(text);
                if (parent.textContent || parent.hasAttribute('value')) {
                    parent.value = text;
                }
                else {
                    parent.textContent = value;
                }
                return parent.firstChild;
            }
            return null;
        });
    }

    /* malevic@0.11.6 - Mar 6, 2018 */

    let componentsCounter = 0;
    function withState(fn, initialState = {}) {
        const parentsStates = new WeakMap();
        const defaultKey = `state-${componentsCounter++}`;
        return function (attrs = {}, ...children) {
            const key = attrs.key == null ? defaultKey : attrs.key;
            return function (parentDomNode) {
                let states;
                if (parentsStates.has(parentDomNode)) {
                    states = parentsStates.get(parentDomNode);
                }
                else {
                    states = new Map();
                    parentsStates.set(parentDomNode, states);
                }
                let match;
                if (states.has(key)) {
                    match = states.get(key);
                }
                else {
                    match = {
                        node: null,
                        state: initialState,
                        attrs: null,
                        children: [],
                    };
                    states.set(key, match);
                }
                match.attrs = attrs;
                match.children = children;
                let callingComponent = false;
                function invokeComponentFn(state, attrs, children) {
                    callingComponent = true;
                    const declaration = fn(Object.assign({}, attrs, { state, setState }), ...children);
                    callingComponent = false;
                    declaration.attrs = declaration.attrs || {};
                    const oldDidMount = declaration.attrs.didmount;
                    const oldDidUpdate = declaration.attrs.didupdate;
                    const oldWillUnmount = declaration.attrs.oldDidUnmount;
                    declaration.attrs.didmount = function (domNode) {
                        states.get(key).node = domNode;
                        oldDidMount && oldDidMount(domNode);
                    };
                    declaration.attrs.didupdate = function (domNode) {
                        states.get(key).node = domNode;
                        oldDidUpdate && oldDidUpdate(domNode);
                    };
                    declaration.attrs.willunmount = function (domNode) {
                        states.delete(key);
                        oldWillUnmount && oldWillUnmount(domNode);
                    };
                    return declaration;
                }
                function setState(newState) {
                    if (callingComponent) {
                        throw new Error('Calling `setState` inside component function leads to infinite recursion');
                    }
                    const match = states.get(key);
                    const merged = Object.assign({}, match.state, newState);
                    match.state = merged;
                    sync(match.node, invokeComponentFn(merged, match.attrs, match.children));
                }
                return invokeComponentFn(match.state, match.attrs, match.children);
            };
        };
    }

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

    function CheckBox(props = {}, ...children) {
        const cls = mergeClass('checkbox', props.class);
        const attrs = omitAttrs(['class', 'checked', 'onchange'], props);
        const check = (domNode) => domNode.checked = Boolean(props.checked);
        return (html("label", Object.assign({ class: cls }, attrs),
            html("input", { class: "checkbox__input", type: "checkbox", checked: props.checked, onchange: props.onchange, didmount: check, didupdate: check }),
            html("span", { class: "checkbox__checkmark" }),
            html("span", { class: "checkbox__content" }, children)));
    }

    function MultiSwitch(props) {
        return (html("span", { class: ['multi-switch', props.class] },
            html("span", { class: "multi-switch__highlight", style: {
                    'left': `${props.options.indexOf(props.value) / props.options.length * 100}%`,
                    'width': `${1 / props.options.length * 100}%`,
                } }),
            props.options.map((option) => (html("span", { class: {
                    'multi-switch__option': true,
                    'multi-switch__option--selected': option === props.value
                }, onclick: () => option !== props.value && props.onChange(option) }, option)))));
    }

    function TextBox(props = {}, text) {
        const cls = mergeClass('textbox', props.class);
        const attrs = omitAttrs(['class', 'type'], props);
        return (html("input", Object.assign({ class: cls, type: "text" }, attrs)));
    }

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

    const valueNodes = new WeakMap();
    function Select(props) {
        const { state, setState } = props;
        const values = Object.keys(props.options);
        let rootNode;
        function onRender(node) {
            rootNode = node;
            if (!valueNodes.has(rootNode)) {
                valueNodes.set(rootNode, new Map());
            }
        }
        function onOuterClick(e) {
            const r = rootNode.getBoundingClientRect();
            if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
                window.removeEventListener('click', onOuterClick);
                collapseList();
            }
        }
        function onTextInput(e) {
            const text = e.target
                .value
                .toLowerCase()
                .trim();
            expandList();
            values.some((value) => {
                if (value.toLowerCase().indexOf(text) === 0) {
                    scrollToValue(value);
                    return true;
                }
            });
        }
        function onKeyPress(e) {
            const input = e.target;
            if (e.key === 'Enter') {
                const value = input.value;
                input.blur();
                collapseList();
                props.onChange(value);
            }
        }
        function scrollToValue(value) {
            setState({ focusedIndex: values.indexOf(value) });
        }
        function onExpandClick() {
            if (state.isExpanded) {
                collapseList();
            }
            else {
                expandList();
            }
        }
        function expandList() {
            setState({ isExpanded: true });
            scrollToValue(props.value);
            window.addEventListener('click', onOuterClick);
        }
        function collapseList() {
            setState({ isExpanded: false });
        }
        function onSelectOption(e) {
            let current = e.target;
            while (current && !current.matches('.select__option')) {
                current = current.parentElement;
            }
            if (current) {
                const value = getData(current);
                props.onChange(value);
            }
            collapseList();
        }
        function saveValueNode(value, domNode) {
            valueNodes.get(rootNode).set(value, domNode);
        }
        function removeValueNode(value) {
            valueNodes.get(rootNode).delete(value);
        }
        return (html("span", { class: "select", didmount: onRender, didupdate: onRender },
            html("span", { class: "select__line" },
                html(TextBox, { class: "select__textbox", value: props.value, oninput: onTextInput, onkeypress: onKeyPress }),
                html(Button, { class: "select__expand", onclick: onExpandClick },
                    html("span", { class: "select__expand__icon" }))),
            html(VirtualScroll, { root: html("span", { class: {
                        'select__list': true,
                        'select__list--expanded': state.isExpanded,
                        'select__list--short': Object.keys(props.options).length <= 7,
                    }, onclick: onSelectOption }), items: Object.entries(props.options).map(([value, content]) => (html("span", { class: "select__option", data: value, didmount: (domNode) => saveValueNode(value, domNode), didupdate: (domNode) => saveValueNode(value, domNode), willunmount: () => removeValueNode(value) }, content))), scrollToIndex: state.focusedIndex })));
    }
    var Select$1 = withState(Select);

    function isFirefox() {
        return navigator.userAgent.indexOf('Firefox') >= 0;
    }
    function isVivaldi() {
        return navigator.userAgent.toLowerCase().indexOf('vivaldi') >= 0;
    }
    function isYaBrowser() {
        return navigator.userAgent.toLowerCase().indexOf('yabrowser') >= 0;
    }
    function isOpera() {
        const agent = navigator.userAgent.toLowerCase();
        return agent.indexOf('opr') >= 0 || agent.indexOf('opera') >= 0;
    }
    function isWindows() {
        return navigator.platform.toLowerCase().indexOf('win') === 0;
    }
    function isMacOS() {
        return navigator.platform.toLowerCase().indexOf('mac') === 0;
    }
    function isMobile() {
        const agent = navigator.userAgent.toLowerCase();
        return agent.indexOf('mobile') >= 0;
    }
    function getChromeVersion() {
        const agent = navigator.userAgent.toLowerCase();
        const m = agent.match(/chrom[e|ium]\/([^ ]+)/);
        if (m && m[1]) {
            return m[1];
        }
        return null;
    }
    function compareChromeVersions($a, $b) {
        const a = $a.split('.').map((x) => parseInt(x));
        const b = $b.split('.').map((x) => parseInt(x));
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                return a[i] < b[i] ? -1 : 1;
            }
        }
        return 0;
    }

    function ShortcutLink(props) {
        const cls = mergeClass('shortcut', props.class);
        const shortcut = props.shortcuts[props.commandName];
        let enteringShortcutInProgress = false;
        function startEnteringShortcut(node) {
            if (enteringShortcutInProgress) {
                return;
            }
            enteringShortcutInProgress = true;
            const initialText = node.textContent;
            node.textContent = '...⌨';
            function onKeyDown(e) {
                e.preventDefault();
                const ctrl = e.ctrlKey;
                const alt = e.altKey;
                const command = e.metaKey;
                const shift = e.shiftKey;
                let key = null;
                if (e.code.startsWith('Key')) {
                    key = e.code.substring(3);
                }
                else if (e.code.startsWith('Digit')) {
                    key = e.code.substring(5);
                }
                const shortcut = `${ctrl ? 'Ctrl+' : alt ? 'Alt+' : command ? 'Command+' : ''}${shift ? 'Shift+' : ''}${key ? key : ''}`;
                node.textContent = shortcut;
                if ((ctrl || alt || command || shift) && key) {
                    removeListeners();
                    props.onSetShortcut(shortcut);
                    node.blur();
                    setTimeout(() => {
                        enteringShortcutInProgress = false;
                        node.classList.remove('shortcut--edit');
                        node.textContent = props.textTemplate(shortcut);
                    }, 500);
                }
            }
            function onBlur() {
                removeListeners();
                node.classList.remove('shortcut--edit');
                node.textContent = initialText;
                enteringShortcutInProgress = false;
            }
            function removeListeners() {
                window.removeEventListener('keydown', onKeyDown, true);
                window.removeEventListener('blur', onBlur, true);
            }
            window.addEventListener('keydown', onKeyDown, true);
            window.addEventListener('blur', onBlur, true);
            node.classList.add('shortcut--edit');
        }
        function onClick(e) {
            e.preventDefault();
            if (isFirefox()) {
                startEnteringShortcut(e.target);
                return;
            }
            chrome.tabs.create({
                url: `chrome://extensions/configureCommands#command-${chrome.runtime.id}-${props.commandName}`,
                active: true
            });
        }
        return (html("a", { class: cls, href: "#", onclick: onClick }, props.textTemplate(shortcut)));
    }

    function Tab({ isActive }, ...children) {
        const tabCls = {
            'tab-panel__tab': true,
            'tab-panel__tab--active': isActive
        };
        return (html("div", { class: tabCls }, children));
    }

    function TabPanel(props) {
        const tabsNames = Object.keys(props.tabs);
        function isActiveTab(name, index) {
            return (name == null
                ? index === 0
                : name === props.activeTab);
        }
        const buttons = tabsNames.map((name, i) => {
            const btnCls = {
                'tab-panel__button': true,
                'tab-panel__button--active': isActiveTab(name, i)
            };
            return (html(Button, { class: btnCls, onclick: () => props.onSwitchTab(name) }, props.tabLabels[name]));
        });
        const tabs = tabsNames.map((name, i) => (html(Tab, { isActive: isActiveTab(name, i) }, props.tabs[name])));
        return (html("div", { class: "tab-panel" },
            html("div", { class: "tab-panel__buttons" }, buttons),
            html("div", { class: "tab-panel__tabs" }, tabs)));
    }

    const propsStore = new WeakMap();
    function TextList(props) {
        function onTextChange(e) {
            const index = getData(e.target);
            const values = props.values.slice();
            const value = e.target.value.trim();
            if (values.indexOf(value) >= 0) {
                return;
            }
            if (!value) {
                values.splice(index, 1);
            }
            else if (index === values.length) {
                values.push(value);
            }
            else {
                values.splice(index, 1, value);
            }
            props.onChange(values);
        }
        function createTextBox(text, index) {
            return (html(TextBox, { class: "text-list__textbox", value: text, data: index, placeholder: props.placeholder }));
        }
        return (node) => {
            let shouldFocus = false;
            const prevProps = propsStore.get(node);
            propsStore.set(node, props);
            if (props.isFocused && (!prevProps ||
                !prevProps.isFocused ||
                prevProps.values.length < props.values.length)) {
                shouldFocus = true;
                requestAnimationFrame(() => {
                    const inputs = node.querySelectorAll('.text-list__textbox');
                    const last = inputs.item(inputs.length - 1);
                    last.focus();
                });
            }
            return (html(VirtualScroll, { root: html("div", { class: ['text-list', props.class], onchange: onTextChange }), items: props.values
                    .map(createTextBox)
                    .concat(createTextBox('', props.values.length)), scrollToIndex: shouldFocus ? props.values.length : -1 }));
        };
    }

    function Toggle(props) {
        const { checked, onChange } = props;
        const cls = [
            'toggle',
            checked ? 'toggle--checked' : null,
            props.class,
        ];
        const clsOn = {
            'toggle__btn': true,
            'toggle__on': true,
            'toggle__btn--active': checked
        };
        const clsOff = {
            'toggle__btn': true,
            'toggle__off': true,
            'toggle__btn--active': !checked
        };
        return (html("span", { class: cls },
            html("span", { class: clsOn, onclick: onChange ? () => !checked && onChange(true) : null }, props.labelOn),
            html("span", { class: clsOff, onclick: onChange ? () => checked && onChange(false) : null }, props.labelOff)));
    }

    function Track(props) {
        const valueStyle = { 'width': `${props.value * 100}%` };
        const isClickable = props.onChange != null;
        function onMouseDown(e) {
            const targetNode = e.currentTarget;
            const valueNode = targetNode.firstElementChild;
            targetNode.classList.add('track--active');
            function getValue(clientX) {
                const rect = targetNode.getBoundingClientRect();
                return (clientX - rect.left) / rect.width;
            }
            function setWidth(value) {
                valueNode.style.width = `${value * 100}%`;
            }
            function onMouseMove(e) {
                const value = getValue(e.clientX);
                setWidth(value);
            }
            function onMouseUp(e) {
                const value = getValue(e.clientX);
                props.onChange(value);
                cleanup();
            }
            function onKeyPress(e) {
                if (e.key === 'Escape') {
                    setWidth(props.value);
                    cleanup();
                }
            }
            function cleanup() {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
                window.removeEventListener('keypress', onKeyPress);
                targetNode.classList.remove('track--active');
            }
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            window.addEventListener('keypress', onKeyPress);
            const value = getValue(e.clientX);
            setWidth(value);
        }
        return (html("span", { class: {
                'track': true,
                'track--clickable': Boolean(props.onChange),
            }, onmousedown: isClickable ? onMouseDown : null },
            html("span", { class: "track__value", style: valueStyle }),
            html("label", { class: "track__label" }, props.label)));
    }

    function getLocalMessage(messageName) {
        return chrome.i18n.getMessage(messageName);
    }
    function getUILanguage() {
        return chrome.i18n.getUILanguage();
    }

    function UpDown(props) {
        const buttonDownCls = {
            'updown__button': true,
            'updown__button--disabled': props.value === props.min
        };
        const buttonUpCls = {
            'updown__button': true,
            'updown__button--disabled': props.value === props.max
        };
        function normalize(x) {
            const exp = Math.ceil(Math.log10(props.step));
            if (exp >= 1) {
                const m = Math.pow(10, exp);
                return Math.round(x / m) * m;
            }
            else {
                const m = Math.pow(10, -exp);
                return Math.round(x * m) / m;
            }
        }
        function clamp(x) {
            return Math.max(props.min, Math.min(props.max, x));
        }
        function onButtonDownClick() {
            props.onChange(clamp(normalize(props.value - props.step)));
        }
        function onButtonUpClick() {
            props.onChange(clamp(normalize(props.value + props.step)));
        }
        function onTrackValueChange(trackValue) {
            props.onChange(clamp(normalize(trackValue * (props.max - props.min) + props.min)));
        }
        const trackValue = (props.value - props.min) / (props.max - props.min);
        const valueText = (props.value === props.default
            ? getLocalMessage('off').toLocaleLowerCase()
            : props.value > props.default
                ? `+${normalize(props.value - props.default)}`
                : `-${normalize(props.default - props.value)}`);
        return (html("div", { class: "updown" },
            html("div", { class: "updown__line" },
                html(Button, { class: buttonDownCls, onclick: onButtonDownClick },
                    html("span", { class: "updown__icon updown__icon-down" })),
                html(Track, { value: trackValue, label: props.name, onChange: onTrackValueChange }),
                html(Button, { class: buttonUpCls, onclick: onButtonUpClick },
                    html("span", { class: "updown__icon updown__icon-up" }))),
            html("label", { class: "updown__value-text" }, valueText)));
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

    function CustomSettingsToggle({ data, tab, actions }) {
        const host = getURLHost(tab.url || '');
        const isCustom = data.settings.customThemes.some(({ url }) => isURLInList(tab.url, url));
        const urlText = (host
            ? host
                .split('.')
                .reduce((elements, part, i) => elements.concat(html("wbr", null), `${i > 0 ? '.' : ''}${part}`), [])
            : 'current site');
        return (html(Button, { class: {
                'custom-settings-toggle': true,
                'custom-settings-toggle--checked': isCustom,
                'custom-settings-toggle--disabled': tab.isProtected || (tab.isInDarkList && !data.settings.applyToListedOnly),
            }, onclick: (e) => {
                if (isCustom) {
                    const filtered = data.settings.customThemes.filter(({ url }) => !isURLInList(tab.url, url));
                    actions.changeSettings({ customThemes: filtered });
                }
                else {
                    const extended = data.settings.customThemes.concat({
                        url: [host],
                        theme: { ...data.settings.theme },
                    });
                    actions.changeSettings({ customThemes: extended });
                    e.currentTarget.classList.add('custom-settings-toggle--checked');
                }
            } },
            html("span", { class: "custom-settings-toggle__wrapper" },
                getLocalMessage('only_for'),
                " ",
                html("span", { class: "custom-settings-toggle__url" }, urlText))));
    }

    function ModeToggle({ mode, onChange }) {
        return (html("div", { class: "mode-toggle" },
            html("div", { class: "mode-toggle__line" },
                html(Button, { class: { 'mode-toggle__button--active': mode === 1 }, onclick: () => onChange(1) },
                    html("span", { class: "icon icon--dark-mode" })),
                html(Toggle, { checked: mode === 1, labelOn: getLocalMessage('dark'), labelOff: getLocalMessage('light'), onChange: (checked) => onChange(checked ? 1 : 0) }),
                html(Button, { class: { 'mode-toggle__button--active': mode === 0 }, onclick: () => onChange(0) },
                    html("span", { class: "icon icon--light-mode" }))),
            html("label", { class: "mode-toggle__label" }, getLocalMessage('mode'))));
    }

    function FilterSettings({ data, actions, tab }) {
        const custom = data.settings.customThemes.find(({ url }) => isURLInList(tab.url, url));
        const filterConfig = custom ? custom.theme : data.settings.theme;
        function setConfig(config) {
            if (custom) {
                custom.theme = { ...custom.theme, ...config };
                actions.changeSettings({ customThemes: data.settings.customThemes });
            }
            else {
                actions.setTheme(config);
            }
        }
        const brightness = (html(UpDown, { value: filterConfig.brightness, min: 50, max: 150, step: 10, default: 100, name: getLocalMessage('brightness'), onChange: (value) => setConfig({ brightness: value }) }));
        const contrast = (html(UpDown, { value: filterConfig.contrast, min: 50, max: 150, step: 10, default: 100, name: getLocalMessage('contrast'), onChange: (value) => setConfig({ contrast: value }) }));
        const grayscale = (html(UpDown, { value: filterConfig.grayscale, min: 0, max: 100, step: 10, default: 0, name: getLocalMessage('grayscale'), onChange: (value) => setConfig({ grayscale: value }) }));
        const sepia = (html(UpDown, { value: filterConfig.sepia, min: 0, max: 100, step: 10, default: 0, name: getLocalMessage('sepia'), onChange: (value) => setConfig({ sepia: value }) }));
        return (html("section", { class: "filter-settings" },
            html(ModeToggle, { mode: filterConfig.mode, onChange: (mode) => setConfig({ mode }) }),
            brightness,
            contrast,
            sepia,
            grayscale,
            html(CustomSettingsToggle, { data: data, tab: tab, actions: actions })));
    }

    function SiteToggleButton({ data, tab, actions }) {
        const toggleHasEffect = (data.isEnabled &&
            !tab.isProtected &&
            (data.settings.applyToListedOnly || !tab.isInDarkList));
        const host = getURLHost(tab.url || '');
        const urlText = (host
            ? host
                .split('.')
                .reduce((elements, part, i) => elements.concat(html("wbr", null), `${i > 0 ? '.' : ''}${part}`), [])
            : 'current site');
        return (html(Button, { class: {
                'site-toggle': true,
                'site-toggle--disabled': !toggleHasEffect
            }, onclick: () => actions.toggleSitePattern(host) },
            getLocalMessage('toggle'),
            " ",
            html("span", { class: "site-toggle__url" }, urlText)));
    }

    function multiline(...lines) {
        return lines.join('\n');
    }
    function TopSection({ data, actions, tab }) {
        function toggleExtension(enabled) {
            actions.changeSettings({ enabled });
        }
        return (html("header", { class: "header" },
            html("img", { class: "header__logo", src: "../assets/images/darkreader-type.svg", alt: "Dark Reader" }),
            html("div", { class: "header__control header__site-toggle" },
                html(SiteToggleButton, { data: data, tab: tab, actions: actions }),
                tab.isProtected ? (html("span", { class: "header__site-toggle__unable-text" }, getLocalMessage('page_protected'))) : tab.isInDarkList ? (html("span", { class: "header__site-toggle__unable-text" }, getLocalMessage('page_in_dark_list'))) : (html(ShortcutLink, { commandName: "addSite", shortcuts: data.shortcuts, textTemplate: (hotkey) => (hotkey
                        ? multiline(getLocalMessage('toggle_current_site'), hotkey)
                        : getLocalMessage('setup_hotkey_toggle_site')), onSetShortcut: (shortcut) => actions.setShortcut('addSite', shortcut) }))),
            html("div", { class: "header__control header__app-toggle" },
                html(Toggle, { checked: data.isEnabled, labelOn: getLocalMessage('on'), labelOff: getLocalMessage('off'), onChange: toggleExtension }),
                html(ShortcutLink, { commandName: "toggle", shortcuts: data.shortcuts, textTemplate: (hotkey) => (hotkey
                        ? multiline(getLocalMessage('toggle_extension'), hotkey)
                        : getLocalMessage('setup_hotkey_toggle_extension')), onSetShortcut: (shortcut) => actions.setShortcut('toggle', shortcut) }))));
    }

    function Loader({ complete = false, state, setState }) {
        return (html("div", { class: {
                'loader': true,
                'loader--complete': complete,
                'loader--transition-end': state.finished,
            }, ontransitionend: () => setState({ finished: true }) },
            html("label", { class: "loader__message" }, getLocalMessage('loading_please_wait'))));
    }
    var Loader$1 = withState(Loader);

    var ThemeEngines = {
        cssFilter: 'cssFilter',
        svgFilter: 'svgFilter',
        staticTheme: 'staticTheme',
        dynamicTheme: 'dynamicTheme',
    };

    const engineNames = [
        [ThemeEngines.cssFilter, getLocalMessage('engine_filter')],
        [ThemeEngines.svgFilter, getLocalMessage('engine_filter_plus')],
        [ThemeEngines.staticTheme, getLocalMessage('engine_static')],
        [ThemeEngines.dynamicTheme, getLocalMessage('engine_dynamic')],
    ];
    function openCSSEditor() {
        chrome.windows.create({
            type: 'panel',
            url: isFirefox() ? '../stylesheet-editor/index.html' : 'ui/stylesheet-editor/index.html',
            width: 600,
            height: 600,
        });
    }
    function EngineSwitch({ engine, onChange }) {
        return (html("div", { class: "engine-switch" },
            html(MultiSwitch, { value: engineNames.find(([code, name]) => code === engine)[1], options: engineNames.map(([code, name]) => name), onChange: (value) => onChange(engineNames.find(([code, name]) => name === value)[0]) }),
            html("span", { class: {
                    'engine-switch__css-edit-button': true,
                    'engine-switch__css-edit-button_active': engine === ThemeEngines.staticTheme,
                }, onclick: openCSSEditor }),
            html("label", { class: "engine-switch__description" }, getLocalMessage('theme_generation_mode'))));
    }

    function FontSettings({ config, fonts, onChange }) {
        return (html("section", { class: "font-settings" },
            html("div", { class: "font-settings__font-select-container" },
                html("div", { class: "font-settings__font-select-container__line" },
                    html(CheckBox, { checked: config.useFont, onchange: (e) => onChange({ useFont: e.target.checked }) }),
                    html(Select$1, { value: config.fontFamily, onChange: (value) => onChange({ fontFamily: value }), options: fonts.reduce((map, font) => {
                            map[font] = (html("div", { style: { 'font-family': font } }, font));
                            return map;
                        }, {}) })),
                html("label", { class: "font-settings__font-select-container__label" }, getLocalMessage('select_font'))),
            html(UpDown, { value: config.textStroke, min: 0, max: 1, step: 0.1, default: 0, name: getLocalMessage('text_stroke'), onChange: (value) => onChange({ textStroke: value }) })));
    }

    function compileMarkdown(markdown) {
        return markdown.split('**')
            .map((text, i) => i % 2 ? (html("strong", null, text)) : text);
    }

    function MoreSettings({ data, actions, tab }) {
        const custom = data.settings.customThemes.find(({ url }) => isURLInList(tab.url, url));
        const filterConfig = custom ? custom.theme : data.settings.theme;
        function setConfig(config) {
            if (custom) {
                custom.theme = { ...custom.theme, ...config };
                actions.changeSettings({ customThemes: data.settings.customThemes });
            }
            else {
                actions.setTheme(config);
            }
        }
        return (html("section", { class: "more-settings" },
            html("div", { class: "more-settings__section" },
                html(FontSettings, { config: filterConfig, fonts: data.fonts, onChange: setConfig })),
            html("div", { class: "more-settings__section" },
                isFirefox() ? null : html("p", { class: "more-settings__description" }, compileMarkdown(getLocalMessage('try_experimental_theme_engines'))),
                html(EngineSwitch, { engine: filterConfig.engine, onChange: (engine) => setConfig({ engine }) })),
            html("div", { class: "more-settings__section" },
                html(CustomSettingsToggle, { data: data, tab: tab, actions: actions }),
                tab.isProtected ? (html("p", { class: "more-settings__description more-settings__description--warning" }, getLocalMessage('page_protected').replace('\n', ' '))) : tab.isInDarkList ? (html("p", { class: "more-settings__description more-settings__description--warning" }, getLocalMessage('page_in_dark_list').replace('\n', ' '))) : (html("p", { class: "more-settings__description" }, getLocalMessage('only_for_description')))),
            isFirefox() ? (html("div", { class: "more-settings__section" },
                html(Toggle, { checked: data.settings.changeBrowserTheme, labelOn: getLocalMessage('custom_browser_theme_on'), labelOff: getLocalMessage('custom_browser_theme_off'), onChange: (checked) => actions.changeSettings({ changeBrowserTheme: checked }) }),
                html("p", { class: "more-settings__description" }, getLocalMessage('change_browser_theme')))) : null));
    }

    const BLOG_URL = 'https://darkreader.org/blog/';
    const DONATE_URL = 'https://opencollective.com/darkreader';
    const GITHUB_URL = 'https://github.com/darkreader/darkreader';
    const PRIVACY_URL = 'https://darkreader.org/privacy/';
    const TWITTER_URL = 'https://twitter.com/darkreaderapp';
    function getHelpURL() {
        const helpLocales = ['be', 'cs', 'de', 'en', 'it', 'ru'];
        const locale = getUILanguage();
        const matchLocale = helpLocales.find((hl) => hl === locale) || helpLocales.find((hl) => locale.startsWith(hl)) || 'en';
        return `https://darkreader.org/help/${matchLocale}/`;
    }

    const NEWS_COUNT = 2;
    function News({ news, expanded, onNewsOpen, onClose }) {
        return (html("div", { class: { 'news': true, 'news--expanded': expanded } },
            html("div", { class: "news__header" },
                html("span", { class: "news__header__text" }, getLocalMessage('news')),
                html("span", { class: "news__close", role: "button", onclick: onClose }, "\u2715")),
            html("div", { class: "news__list" },
                news.slice(0, NEWS_COUNT).map((event) => {
                    const date = new Date(event.date);
                    let formattedDate;
                    try {
                        const locale = getUILanguage();
                        formattedDate = date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
                    }
                    catch (err) {
                        formattedDate = date.toISOString().substring(0, 10);
                    }
                    return (html("div", { class: { 'news__event': true, 'news__event--unread': !event.read } },
                        html("a", { class: "news__event__link", onclick: () => onNewsOpen(event), href: event.url, target: "_blank" },
                            html("span", { class: "news__event__date" }, formattedDate),
                            event.headline)));
                }),
                (news.length <= NEWS_COUNT
                    ? null
                    : html("a", { class: {
                            'news__read-more': true,
                            'news__read-more--unread': news.slice(NEWS_COUNT).find(({ read }) => !read),
                        }, href: BLOG_URL, target: "_blank", onclick: () => onNewsOpen(...news) }, getLocalMessage('read_more'))))));
    }
    function NewsButton({ active, count, onClick }) {
        return (html(Button, { class: { 'news-button': true, 'news-button--active': active }, href: "#news", "data-count": count > 0 && !active ? count : null, onclick: (e) => {
                e.currentTarget.blur();
                onClick();
            } }, getLocalMessage('news')));
    }

    function SiteListSettings({ data, actions, isFocused }) {
        function isSiteUrlValid(value) {
            return /^([^\.\s]+?\.?)+$/.test(value);
        }
        return (html("section", { class: "site-list-settings" },
            html(Toggle, { class: "site-list-settings__toggle", checked: data.settings.applyToListedOnly, labelOn: getLocalMessage('invert_listed_only'), labelOff: getLocalMessage('not_invert_listed'), onChange: (value) => actions.changeSettings({ applyToListedOnly: value }) }),
            html(TextList, { class: "site-list-settings__text-list", placeholder: "google.com/maps", values: data.settings.siteList, isFocused: isFocused, onChange: (values) => {
                    if (values.every(isSiteUrlValid)) {
                        actions.changeSettings({ siteList: values });
                    }
                } }),
            html(ShortcutLink, { class: "site-list-settings__shortcut", commandName: "addSite", shortcuts: data.shortcuts, textTemplate: (hotkey) => (hotkey
                    ? `${getLocalMessage('add_site_to_list')}: ${hotkey}`
                    : getLocalMessage('setup_add_site_hotkey')), onSetShortcut: (shortcut) => actions.setShortcut('addSite', shortcut) })));
    }

    function getDuration(time) {
        let duration = 0;
        if (time.seconds) {
            duration += time.seconds * 1000;
        }
        if (time.minutes) {
            duration += time.minutes * 60 * 1000;
        }
        if (time.hours) {
            duration += time.hours * 60 * 60 * 1000;
        }
        if (time.days) {
            duration += time.days * 24 * 60 * 60 * 1000;
        }
        return duration;
    }

    withForms();
    function openDevTools() {
        chrome.windows.create({
            type: 'panel',
            url: isFirefox() ? '../devtools/index.html' : 'ui/devtools/index.html',
            width: 600,
            height: 600,
        });
    }
    function Body(props) {
        const { state, setState } = props;
        if (!props.data.isReady) {
            return (html("body", null,
                html(Loader$1, null)));
        }
        const unreadNews = props.data.news.filter(({ read }) => !read);
        function toggleNews() {
            if (state.newsOpen && unreadNews.length > 0) {
                props.actions.markNewsAsRead(unreadNews.map(({ id }) => id));
            }
            setState({ newsOpen: !state.newsOpen });
        }
        function onNewsOpen(...news) {
            const unread = news.filter(({ read }) => !read);
            if (unread.length > 0) {
                props.actions.markNewsAsRead(unread.map(({ id }) => id));
            }
        }
        let displayedNewsCount = unreadNews.length;
        if (unreadNews.length > 0 && !props.data.settings.notifyOfNews) {
            const latest = new Date(unreadNews[0].date);
            const today = new Date();
            const newsWereLongTimeAgo = latest.getTime() < today.getTime() - getDuration({ days: 14 });
            if (newsWereLongTimeAgo) {
                displayedNewsCount = 0;
            }
        }
        return (html("body", { class: { 'ext-disabled': !props.data.isEnabled } },
            html(Loader$1, { complete: true }),
            html(TopSection, { data: props.data, tab: props.tab, actions: props.actions }),
            html(TabPanel, { activeTab: state.activeTab || 'Filter', onSwitchTab: (tab) => setState({ activeTab: tab }), tabs: {
                    'Filter': (html(FilterSettings, { data: props.data, actions: props.actions, tab: props.tab })),
                    'Site list': (html(SiteListSettings, { data: props.data, actions: props.actions, isFocused: state.activeTab === 'Site list' })),
                    'More': (html(MoreSettings, { data: props.data, actions: props.actions, tab: props.tab })),
                }, tabLabels: {
                    'Filter': getLocalMessage('filter'),
                    'Site list': getLocalMessage('site_list'),
                    'More': getLocalMessage('more'),
                } }),
            html("footer", null,
                html("div", { class: "footer-links" },
                    html("a", { class: "footer-links__link", href: PRIVACY_URL, target: "_blank" }, getLocalMessage('privacy')),
                    html("a", { class: "footer-links__link", href: TWITTER_URL, target: "_blank" }, "Twitter"),
                    html("a", { class: "footer-links__link", href: GITHUB_URL, target: "_blank" }, "GitHub"),
                    html("a", { class: "footer-links__link", href: getHelpURL(), target: "_blank" }, getLocalMessage('help'))),
                html("div", { class: "footer-buttons" },
                    html("a", { class: "donate-link", href: DONATE_URL, target: "_blank" },
                        html("span", { class: "donate-link__text" }, getLocalMessage('donate'))),
                    html(NewsButton, { active: state.newsOpen, count: displayedNewsCount, onClick: toggleNews }),
                    html(Button, { onclick: openDevTools, class: "dev-tools-button" },
                        "\uD83D\uDEE0 ",
                        getLocalMessage('open_dev_tools')))),
            html(News, { news: props.data.news, expanded: state.newsOpen, onNewsOpen: onNewsOpen, onClose: toggleNews })));
    }
    var Body$1 = withState(Body);

    function popupHasBuiltInBorders() {
        const chromeVersion = getChromeVersion();
        return Boolean(chromeVersion &&
            !isVivaldi() &&
            !isYaBrowser() &&
            !isOpera() &&
            isWindows() &&
            compareChromeVersions(chromeVersion, '62.0.3167.0') < 0);
    }
    function popupHasBuiltInHorizontalBorders() {
        const chromeVersion = getChromeVersion();
        return Boolean(chromeVersion &&
            !isVivaldi() &&
            !isYaBrowser() &&
            !isOpera() && ((isWindows() && compareChromeVersions(chromeVersion, '62.0.3167.0') >= 0) ||
            (isMacOS() && compareChromeVersions(chromeVersion, '67.0.3373.0') >= 0)));
    }
    function fixNotClosingPopupOnNavigation() {
        document.addEventListener('click', (e) => {
            if (e.defaultPrevented || e.button === 2) {
                return;
            }
            let target = e.target;
            while (target && !(target instanceof HTMLAnchorElement)) {
                target = target.parentElement;
            }
            if (target && target.hasAttribute('href')) {
                requestAnimationFrame(() => window.close());
            }
        });
    }

    function renderBody(data, tab, actions) {
        sync(document.body, (html(Body$1, { data: data, tab: tab, actions: actions })));
    }
    async function start() {
        const connector = connect();
        window.addEventListener('unload', (e) => connector.disconnect());
        const [data, tab] = await Promise.all([
            connector.getData(),
            connector.getActiveTabInfo(),
        ]);
        renderBody(data, tab, connector);
        connector.subscribeToChanges((data) => renderBody(data, tab, connector));
    }
    start();
    document.documentElement.classList.toggle('mobile', isMobile());
    document.documentElement.classList.toggle('built-in-borders', popupHasBuiltInBorders());
    document.documentElement.classList.toggle('built-in-horizontal-borders', popupHasBuiltInHorizontalBorders());
    if (isFirefox()) {
        fixNotClosingPopupOnNavigation();
    }

}());
