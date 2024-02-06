/*!
 * Copyright(c) Live2D Inc. All rights reserved.
 * Licensed under the MIT License.
 * https://opensource.org/license/mit/
 */

class NLPlugin {
    static get apiVersion() { return "1.0.0" }
    static get CLOSED() { return 0 }
    static get CONNECTING() { return 1 }
    static get OPEN() { return 2 }
    static get ESTABLISHED() { return 3 }
    static get AVAILABLE() { return 4 }

    get name() { return this.#name }
    developer = ""
    version = ""
    token = ""
    debug = false
    get state() { return this.#state }
    onStateChanged = (state) => { }

    constructor(name) {
        if (name == null) throw "name is empty!"
        this.#name = name
    }

    start(address) {
        if (this.#socket) {
            this.#socket.onopen = null
            this.#socket.onclose = null
            this.#socket.onmessage = null
            this.#socket.close()
        }
        this.#socket = new WebSocket(address)
        this.#setState(NLPlugin.CONNECTING)
        this.#socket.onopen = (event) => {
            this.#setState(NLPlugin.OPEN)
            this.#establishConnection().catch(e => this.#registerPlugin()).catch(e => this.stop())
        }
        this.#socket.onclose = (event) => {
            if (this.state === NLPlugin.CONNECTING) {
                setTimeout(() => { this.start(this.#socket.url) }, 1000)
            } else {
                this.stop()
            }
        }
        this.#socket.onmessage = (event) => {
            const message = JSON.parse(event.data)
            if (this.debug) console.log("<<<<<<<<<<<<<<<< Received <<<<<<<<<<<<<<<<\n", JSON.stringify(message, undefined, 2))
            if (message.Id in this.#promises) {
                if (message.Type === "Response") {
                    this.#promises[message.Id].resolve(message)
                } else if (message.Type === "Error") {
                    this.#promises[message.Id].reject(message)
                }
                delete this.#promises[message.Id]
            }
            if (message.Type === "Event") {
                if (message.Method === "NotifyEnabledChanged") {
                    if (message.Data.Enabled) {
                        this.#setState(NLPlugin.AVAILABLE)
                    } else {
                        this.#setState(NLPlugin.ESTABLISHED)
                    }
                }
                if (message.Method in this.#eventListener) {
                    for (let callback of this.#eventListener[message.Method]) {
                        callback(message)
                    }
                }
            }
        }
    }

    startLocalhost(port) {
        return this.start(`ws://localhost:${port}/`)
    }

    stop() {
        this.#setState(NLPlugin.CLOSED)
        if (this.#socket) {
            this.#socket.close()
        }
        this.#socket = null
    }

    addEventListener(event, callback) {
        if (this.#eventListener[event] == null)
            this.#eventListener[event] = []
        this.#eventListener[event].push(callback)
    }

    async callMethod(method, data) {
        if (this.state !== NLPlugin.AVAILABLE) throw "API not ready!"
        return await this.#sendRequest(method, data)
    }

    // private
    static #messageId = 0
    #name
    #state = NLPlugin.CLOSED
    #socket
    #promises = {}
    #eventListener = {}
    #setState(state) {
        if (this.#state === state) return
        this.#state = state
        this.onStateChanged(state)
    }

    async #sendRequest(method, data) {
        const id = String(NLPlugin.#messageId++)
        const message = {
            nLPlugin: NLPlugin.apiVersion,
            Timestamp: Date.now(),
            Id: id,
            Type: "Request",
            Method: method,
            Data: data
        }
        if (this.debug) console.log(">>>>>>>>>>>>>>>>   Send   >>>>>>>>>>>>>>>>\n", JSON.stringify(message, undefined, 2))
        this.#socket.send(JSON.stringify(message))
        return await new Promise((resolve, reject) => {
            this.#promises[id] = {
                resolve: resolve,
                reject: reject
            }
        })
    }

    async #registerPlugin() {
        if (this.state !== NLPlugin.OPEN) return Promise.reject()
        return this.#sendRequest("RegisterPlugin", {
            Name: this.name,
            Developer: this.developer,
            Version: this.version
        }).then(message => {
            this.token = message.Data.Token
            this.#setState(NLPlugin.ESTABLISHED)
            return Promise.resolve()
        })
    }

    async #establishConnection() {
        if (this.token == null) return Promise.reject()
        if (this.state !== NLPlugin.OPEN) return Promise.reject()
        return this.#sendRequest("EstablishConnection", {
            Name: this.name,
            Token: this.token,
            Version: this.version
        }).then(message => {
            this.#setState(NLPlugin.ESTABLISHED)
            if (message.Data.Enabled) {
                this.#setState(NLPlugin.AVAILABLE)
            }
            return Promise.resolve()
        })
    }
}