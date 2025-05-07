export const buildTask = (id, color, pos) => ({
    id,
    label: `Task ${id}`,
    color,
    x: pos.x,
    y: pos.y,
    completed: false,
})