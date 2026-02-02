const editor = document.getElementById("editor")
const canvas = document.getElementById("canvas")
const svg = document.getElementById("connections")

const addBtn = document.getElementById("add")
const removeBtn = document.getElementById("remove")
const gotoBtn = document.getElementById("goto")
const nameInput = document.getElementById("nameInput")

let nodes = [
  { id: 0, name: "Root", x: 80, y: 120 }
]

let connections = []
let selected = null
let dragging = null
let offsetX = 0
let offsetY = 0
let nextId = 1

function updateUI() {
  const active = selected !== null
  addBtn.disabled = !active
  removeBtn.disabled = !active || selected === 0
  gotoBtn.disabled = !active
  nameInput.disabled = !active
  if (active) {
    const n = nodes.find(n => n.id === selected)
    nameInput.value = n.name
  } else {
    nameInput.value = ""
  }
}

function render() {
  canvas.querySelectorAll(".node").forEach(n => n.remove())
  svg.innerHTML = ""

  connections.forEach(c => {
    const a = nodes.find(n => n.id === c.from)
    const b = nodes.find(n => n.id === c.to)

    const x1 = a.x + 140
    const y1 = a.y + 25
    const x2 = b.x
    const y2 = b.y + 25

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute(
      "d",
      `M ${x1} ${y1} C ${x1 + 80} ${y1}, ${x2 - 80} ${y2}, ${x2} ${y2}`
    )
    path.setAttribute("stroke", "#695847")
    path.setAttribute("fill", "none")
    path.setAttribute("stroke-width", "2")
    svg.appendChild(path)
  })

  nodes.forEach(n => {
    const el = document.createElement("div")
    el.className = "node" + (selected === n.id ? " selected" : "")
    el.textContent = n.name
    el.style.transform = `translate(${n.x}px, ${n.y}px)`
    el.dataset.id = n.id
    canvas.appendChild(el)

    el.addEventListener("mousedown", e => {
      dragging = n
      const rect = canvas.getBoundingClientRect()
      offsetX = e.clientX - rect.left - n.x + editor.scrollLeft
      offsetY = e.clientY - rect.top - n.y + editor.scrollTop
    })

    el.addEventListener("click", e => {
      e.stopPropagation()
      selected = n.id
      updateUI()
      render()
    })
  })
}

canvas.addEventListener("mousemove", e => {
  if (!dragging) return
  const rect = canvas.getBoundingClientRect()
  dragging.x = e.clientX - rect.left + editor.scrollLeft - offsetX
  dragging.y = e.clientY - rect.top + editor.scrollTop - offsetY
  render()
})

document.addEventListener("mouseup", () => dragging = null)

canvas.addEventListener("click", () => {
  selected = null
  updateUI()
  render()
})

addBtn.onclick = () => {
  const parent = nodes.find(n => n.id === selected)
  const node = {
    id: nextId++,
    name: "Branch",
    x: parent.x + 220,
    y: parent.y + connections.filter(c => c.from === parent.id).length * 80
  }
  nodes.push(node)
  connections.push({ from: parent.id, to: node.id })
  render()
}

removeBtn.onclick = () => {
  nodes = nodes.filter(n => n.id !== selected)
  connections = connections.filter(c => c.from !== selected && c.to !== selected)
  selected = null
  updateUI()
  render()
}

nameInput.oninput = () => {
  const n = nodes.find(n => n.id === selected)
  if (n) n.name = nameInput.value
  render()
}

gotoBtn.onclick = () => {}

updateUI()
render()
