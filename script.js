/*!
 * Copyright(c) Live2D Inc. All rights reserved.
 * Licensed under the MIT License.
 * https://opensource.org/license/mit/
 */

const nLPlugin = new NLPlugin("Parameters Preview")
nLPlugin.developer = "Live2D Inc."
nLPlugin.version = "1.0.0"
nLPlugin.token = localStorage.getItem("token")
// nLPlugin.debug = true

function connect() {
    if (nLPlugin.state === NLPlugin.CLOSED) {
        nLPlugin.start(url.value)
    } else {
        nLPlugin.stop()
    }
}

nLPlugin.onStateChanged = (state) => {
    switch (state) {
        case NLPlugin.CLOSED:
            document.getElementById("state").textContent = "Closed"
            break
        case NLPlugin.CONNECTING:
            document.getElementById("state").textContent = "Connecting"
            break
        case NLPlugin.OPEN:
            document.getElementById("state").textContent = "Open"
            break
        case NLPlugin.ESTABLISHED:
            document.getElementById("state").textContent = "Established"
            // Token の保存
            localStorage.setItem("token", nLPlugin.token)
            break
        case NLPlugin.AVAILABLE:
            document.getElementById("state").textContent = "Available"
            break
    }
    if (state === NLPlugin.AVAILABLE) {
        nLPlugin.callMethod("NotifyFrameUpdated", { "Enabled": true })
        nLPlugin.callMethod("NotifyCurrentModelChanged", { "Enabled": true })
        nLPlugin.callMethod("GetCurrentModelId").then(setCurrentModel)
    } else {
        document.getElementById("modelId").textContent = ""
    }
}

nLPlugin.addEventListener("NotifyFrameUpdated", setParameterValues)
nLPlugin.addEventListener("NotifyCurrentModelChanged", setCurrentModel)

let modelId = ""

function setCurrentModel(message) {
    modelId = message.Data.ModelId
    document.getElementById("modelId").textContent = modelId
    nLPlugin.callMethod("GetLiveParameters", {}).then(setLiveParameters)
    nLPlugin.callMethod("GetCubismParameters", { "ModelId": modelId }).then(setCubismParameters)
}

function setLiveParameters(message) {
    // 現在の表示を削除
    const livePreview = document.getElementById('livePreview')
    while (livePreview.firstChild)
        livePreview.removeChild(livePreview.firstChild)
    // パラメータを表示
    for (let param of message.Data.LiveParameters) {
        const tr = document.createElement("tr")
        livePreview.appendChild(tr)

        const id = document.createElement("td")
        livePreview.appendChild(id)
        id.appendChild(document.createTextNode(param.Id))

        const sliderTd = document.createElement("td")
        livePreview.appendChild(sliderTd)
        const slider = document.createElement("input")
        sliderTd.appendChild(slider)
        slider.type = "range"
        slider.id = "LiveSlider" + param.Id
        slider.min = param.Min
        slider.max = param.Max
        slider.step = "any"

        const valueTd = document.createElement("td")
        livePreview.appendChild(valueTd)
        valueTd.id = "LiveText" + param.Id
        const value = document.createTextNode("0")
        valueTd.appendChild(value)
    }
}

function setCubismParameters(message) {
    // 現在の表示を削除
    const cubismPreview = document.getElementById('cubismPreview')
    while (cubismPreview.firstChild)
        cubismPreview.removeChild(cubismPreview.firstChild)
    // パラメータを表示
    for (let param of message.Data.CubismParameters) {
        const tr = document.createElement("tr")
        cubismPreview.appendChild(tr)

        const id = document.createElement("td")
        cubismPreview.appendChild(id)
        id.appendChild(document.createTextNode(param.Id))

        const sliderTd = document.createElement("td")
        cubismPreview.appendChild(sliderTd)
        const slider = document.createElement("input")
        sliderTd.appendChild(slider)
        slider.type = "range"
        slider.id = "CubismSlider" + param.Id
        slider.min = param.Min
        slider.max = param.Max
        slider.step = "any"

        const valueTd = document.createElement("td")
        cubismPreview.appendChild(valueTd)
        valueTd.id = "CubismText" + param.Id
        const value = document.createTextNode("0")
        valueTd.appendChild(value)
    }
}

function setParameterValues(message) {
    for (let model of message.Data.Models) {
        if (model.ModelId !== modelId) continue
        for (let param of model.LiveParameterValues) {
            const slider = document.getElementById("LiveSlider" + param.Id)
            if (slider) {
                slider.value = param.Value
                const text = document.getElementById("LiveText" + param.Id)
                text.textContent = Math.round(param.Value * 100) / 100
            }
        }
        for (let param of model.CubismParameterValues) {
            const slider = document.getElementById("CubismSlider" + param.Id)
            if (slider) {
                slider.value = param.Value
                const text = document.getElementById("CubismText" + param.Id)
                text.textContent = Math.round(param.Value * 100) / 100
            }
        }
    }
}
