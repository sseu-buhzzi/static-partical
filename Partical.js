var canvas = document.getElementById("partical");
var context = canvas.getContext("2d");

var equilibrium = 0.25;
var force_range = 256;
var decay = 0.5;

var width = 4096;
var height = 4096;
var depth = 256;

var quantity = 4096;
var elapse = 0;
var variety = 16;

var vision_cone = 60;

var drawing_field = false;

function resize_canvas() {
    canvas.width = canvas.height = Math.min(Math.max(width, height, depth, 1024), 2048);
}
resize_canvas();

const RAINBOW_COLORS = [
    "rgb(255, 0, 0)",
    "rgb(255, 165, 0)",
    "rgb(255, 255, 0)",
    "rgb(0, 128, 0)",
    "rgb(0, 255, 255)",
    "rgb(0, 0, 255)",
    "rgb(128, 0, 128)"
];
const HIGH_COTRAST_COLOR = [
    "#e6194b",
    "#3cb44b",
    "#ffe119",
    "#4363d8",
    "#f58231",
    "#911eb4",
    "#42d4f4",
    "#f032e6",
    "#bfef45",
    "#fabed4",
    "#469990",
    "#dcbeff",
    "#9a6324",
    "#fffac8",
    "#800000",
    "#aaffc3"
];
function get_random_colors(count) {
    let random_colors = HIGH_COTRAST_COLOR.sort(() => Math.random() - 0.5).slice(0, count);
    for (let i = 0; i < count - random_colors.length; ++i) {
        random_colors.push("#" + Math.floor(Math.random() * 0x1000000).toString(16));
    }
    return random_colors;
}
function make_factor_matrix() {
    let matrix = new Array(variety);
    for (let i = 0; i < variety; ++i) {
        matrix[i] = new Array(variety);
        for (let j = 0; j < variety; ++j) {
            matrix[i][j] = Math.random() * 2 - 1;
        }
    }
    return matrix;
}
var partical_colors = get_random_colors(variety);
var factor_matrix = make_factor_matrix();

function norm(x) {
    let square = 0;
    for (let dim = 0; dim < x.length; ++dim) {
        square += Math.pow(x[dim], 2);
    }
    return square
}

function trans(matrix) {
    let transposition = [];
    for (let j = 0; j < matrix[0].length; ++j) {
        transposition.push([]);
        for (let i = 0; i < matrix.length; ++i) {
            transposition[j].push(matrix[i][j]);
        }
    }
    return transposition;
}

function submatrix(matrix, row, col) {
    let sub = [];
    for (let i = 0; i < matrix.length; ++i) {
        if (i === row) {
            continue;
        }
        sub.push([]);
        for (let j = 0; j < matrix[0].length; ++j) {
            if (j === col) {
                continue;
            }
            sub[sub.length - 1].push(matrix[i][j]);
        }
    }
    return sub;
}

function det(square) {
    if (square.length === 1) {
        return square[0][0];
    }
    let determinant = 0;
    let minus = 1;
    for (let j = 0; j < square.length; ++j) {
        const sub = submatrix(square, 0, j);
        determinant += minus * square[0][j] * det(sub);
        minus = -minus;
    }
    return determinant;
}

function force(r, a) {
    if (r < equilibrium) {
        return r / equilibrium - 1;
    }
    if (r < 1) {
        return a * (1 - Math.abs(2 * r - equilibrium - 1) / (1 - equilibrium));
    }
    return 0;
}

const camera = {
    phi: 180,
    theta: 90,
    rho: 4096,
    coord: [0, 0, 0],
    orthographic: false,
    lateral_move(movement) {
        this.theta += movement;
        while (this.theta < 0) {
            this.theta += 360;
        }
        while (this.theta >= 360) {
            this.theta -= 360;
        }
    },
    longitudinal_move(movement) {
        this.phi += movement;
        if (this.phi < 0) {
            this.phi = 0;
        } else if (this.phi >= 180) {
            this.phi = 180;
        }
    },
    radial_move(movement) {
        this.rho *= Math.exp(movement / 512);
    },
    projection(point) {
        const sph = Math.sin(this.phi * Math.PI / 180);
        const cph = Math.cos(this.phi * Math.PI / 180);
        const sth = Math.sin(this.theta * Math.PI / 180);
        const cth = Math.cos(this.theta * Math.PI / 180);
        const i = [sth, -cth, 0];
        const j = [cph * cth, cph * sth, -sph];
        const k = [sph * cth, sph * sth, cph];
        const x = point.map((value, index) => value + this.rho * k[index] - this.coord[index]);
        let det_A = det([i, j, k]);
        let det_0 = det([x, j, k]);
        let det_1 = det([i, x, k]);
        let det_2 = det([i, j, x]);
        let ortho = [det_0 / det_A, det_1 / det_A, det_2 / det_A];
        if (this.orthographic) {
            return [ortho[0] + canvas.width / 2, ortho[1] + canvas.height / 2];
        }
        const zoom = 180 / (Math.PI * vision_cone);
        let khi = Math.atan2(ortho[0], ortho[2]);
        let upsilon = Math.atan2(ortho[1], ortho[2]);
        return [(zoom * khi + 0.5) * canvas.width, (zoom * upsilon + 0.5) * canvas.height];
    }
};

function surface_projection(left, top, right, bottom, surface_depth) {
    let surface = new Array(bottom - top);
    for (let i = 0; i < right - left; ++i) {
        surface[i] = new Array(right - left);
    }
    for (let i = 0; i < surface.length; ++i) {
        for (let j = 0; j < surface[0].length; ++j) {
            surface[i][j] = camera.projection([left + j, top + i, surface_depth]);
        }
    }
    return surface;
}

// User control relative start

let direction_key_status = {
    horizon: 0,
    vertical: 0,
    zoom: 0
};
let direction_key = {
    up: document.getElementById("direction-key-up"),
    right: document.getElementById("direction-key-right"),
    left: document.getElementById("direction-key-left"),
    down: document.getElementById("direction-key-down"),
    plus: document.getElementById("direction-key-plus"),
    minus: document.getElementById("direction-key-minus"),
    shift: document.getElementById("direction-key-shift")
};

direction_key.up.addEventListener("mousedown", () => {
    direction_key_status.vertical = 1;
    camera.longitudinal_move(direction_key_status.vertical);
});
direction_key.right.addEventListener("mousedown", () => {
    direction_key_status.horizon = 1;
    camera.lateral_move(direction_key_status.horizon);
});
direction_key.down.addEventListener("mousedown", () => {
    direction_key_status.vertical = -1;
    camera.longitudinal_move(direction_key_status.vertical);
});
direction_key.left.addEventListener("mousedown", () => {
    direction_key_status.horizon = -1;
    camera.lateral_move(direction_key_status.horizon);
});
direction_key.plus.addEventListener("mousedown", () => {
    direction_key_status.zoom = -16;
    camera.radial_move(direction_key_status.zoom);
});
direction_key.minus.addEventListener("mousedown", () => {
    direction_key_status.zoom = 16;
    camera.radial_move(direction_key_status.zoom);
});
direction_key.shift.addEventListener("mousedown", () => {
    camera.orthographic = !camera.orthographic;
});

setInterval(() => {
    camera.lateral_move(direction_key_status.horizon);
    camera.longitudinal_move(direction_key_status.vertical);
    camera.radial_move(direction_key_status.zoom);
}, 16);

function document_keydown(event) {
    switch (event.key) {
        case "ArrowUp": {
            camera.longitudinal_move(1);
            epoch.particals.display(true);
            break;
        }
        case "ArrowRight": {
            camera.lateral_move(1);
            epoch.particals.display(true);
            break;
        }
        case "ArrowDown": {
            camera.longitudinal_move(-1);
            epoch.particals.display(true);
            break;
        }
        case "ArrowLeft": {
            camera.lateral_move(-1);
            epoch.particals.display(true);
            break;
        }
        case "Enter": {
            camera.orthographic = !camera.orthographic;
            epoch.particals.display(true);
            break;
        }
    }
    switch (event.code) {
        case "Space": {
            if (event.shiftKey) {
                camera.coord[2] -= 16;
            } else {
                camera.coord[2] += 16;
            }
            break;
        }
        case "KeyA": {
            camera.coord[0] -= 16;
            break;
        }
        case "KeyD": {
            camera.coord[0] += 16;
            break;
        }
        case "KeyS": {
            camera.coord[1] -= 16;
            break;
        }
        case "KeyW": {
            camera.coord[1] += 16;
            break;
        }
    }
}

let cursor_pos = [0, 0];
let cursor_dragging = false;
function canvas_mousedown(event) {
    cursor_pos[0] = event.x;
    cursor_pos[1] = event.y;
    cursor_dragging = true;
}
function canvas_mouseup() {
    cursor_dragging = false;
    direction_key_status.horizon = 0;
    direction_key_status.vertical = 0;
    direction_key_status.zoom = 0;
    direction_key_status.shift = false;
    epoch.particals.display(false);
}
function canvas_mousemove(event) {
    if (cursor_dragging) {
        camera.lateral_move(cursor_pos[0] - event.x);
        camera.longitudinal_move(event.y - cursor_pos[1]);
        cursor_pos[0] = event.x;
        cursor_pos[1] = event.y;
        epoch.particals.display(false);
    }
}
function canvas_wheel(event) {
    camera.radial_move(event.deltaY);
    epoch.particals.display(false);
}

canvas.addEventListener("mousedown", canvas_mousedown);
document.addEventListener("mouseup", canvas_mouseup);
document.addEventListener("mousemove", canvas_mousemove);
canvas.addEventListener("wheel", canvas_wheel);
document.addEventListener("keydown", document_keydown);

// User control relative end

// Field relative start

function CalcFieldStrength(particals, left, top, right, bottom, surface, test_partical_index) {
    let field_strength = new Array(bottom - top);
    for (let i = 0; i < field_strength.length; ++i) {
        field_strength[i] = new Array(right - left);
        for (let j = 0; j < field_strength[0].length; ++j) {
            field_strength[i][j] = [0, 0];
        }
    }
    for (let partical of particals) {
        for (let j = -force_range, col = Math.floor(partical.x[0]) - force_range; j < force_range; ++j, ++col) {
            if (col < left || col >= right) {
                continue;
            }
            for (let i = -force_range, row = Math.floor(partical.x[1]) - force_range; i < force_range; ++i, ++row) {
                if (row < top || row >= bottom) {
                    continue;
                }
                let delta_x = [j, i, surface - partical.x[2]];
                let r = norm(delta_x);
                if (r > force_range) {
                    continue;
                }
                let f = force(
                    r / force_range,
                    factor_matrix[test_partical_index][partical.color_index] ?? 1
                );
                let k = f / r;
                let ddx = field_strength[row - top][col - left];
                ddx[0] += k * delta_x[0] || 0;
                ddx[1] += k * delta_x[1] || 0;
            }
        }
    }
    return field_strength;
}

function CalcFieldPotential(field_strength) {
    let field_potential = new Array(field_strength.length);
    for (let i = 0; i < field_potential.length; ++i) {
        field_potential[i] = new Array(field_strength[0].length);
    }
    field_potential[0][0] = 0;
    let ground = 0;
    let peak = 0;
    for (let i = 0; i < field_potential.length - 1; ++i) {
        for (let j = 0; j < field_potential[0].length - 1; ++j) {
            let energy = field_potential[i][j];
            ground = Math.min(energy, ground);
            peak = Math.max(energy, peak);
            field_potential[i][j + 1] = energy + (field_strength[i][j][0] || 0);
            field_potential[i + 1][j] = energy + (field_strength[i][j][1] || 0);
        }
    }
    const energy_diff = peak - ground;
    for (let i = 0; i < field_potential.length; ++i) {
        for (let j = 0; j < field_potential[0].length; ++j) {
            field_potential[i][j] = (field_potential[i][j] - ground) / energy_diff;
        }
    }
    return field_potential;
}

function draw_field(left, top, right, bottom, surface_depth, test_partical_index) {
    let field_strength = CalcFieldStrength(epoch.particals.list, left, top, right, bottom, surface_depth, test_partical_index);
    let field_potential = CalcFieldPotential(field_strength);
    let projected_surface = surface_projection(left, top, right, bottom, surface_depth);
    let px_width = projected_surface[1][1][0] - projected_surface[0][0][0];
    let px_height = projected_surface[1][1][1] - projected_surface[0][0][1];
    for (let i = 0; i < field_potential.length; ++i) {
        for (let j = 0; j < field_potential[0].length; ++j) {
            let value = field_potential[i][j] * 255;
            context.fillStyle = `rgb(${value}, ${value}, ${value})`;
            context.fillRect(...projected_surface[i][j], px_height, px_width);
        }
    }
}

// Field relative end

// Partical movement relative start

class Partical{
    constructor(color_index, x) {
        this.color_index = color_index ?? Math.floor(Math.random() * partical_colors.length);
        this.x = x ?? [width, height, depth].map(value => Math.floor(Math.random() * value - value / 2));
        this.dx = [0, 0, 0];
    }

    draw() {
        context.beginPath();
        context.arc(...camera.projection(this.x), 4, 0, 2 * Math.PI);
        context.fillStyle = partical_colors[this.color_index];
        context.fill();
        context.closePath();
    }

    move() {
        for (let dim = 0; dim < this.x.length; ++dim) {
            this.x[dim] += this.dx[dim] || 0;
        }
    }

    select(identify_color) {
        context.beginPath();
        context.arc(...camera.projection(this.x), 8, 0, 2 * Math.PI);
        context.strokeStyle = identify_color;
        context.stroke();
        context.closePath();
    }
};

class ParticalList{
    constructor() {
        this.list = [];
        while (this.length < quantity ?? 0) {
            this.list.push(new Partical());
        }
    }

    display(not_static) {
        context.clearRect(0, 0, canvas.width, canvas.height);

        const ground = [
            [1, 1, -1],
            [-1, 1, -1],
            [-1, -1, -1],
            [1, -1, -1],
            [1, 1, 1],
            [-1, 1, 1],
            [-1, -1, 1],
            [1, -1, 1]
        ].map(coord => camera.projection([coord[0] * width / 2, coord[1] * height / 2, coord[2] * depth / 2]));
        context.beginPath();
        context.moveTo(...ground[3]);
        for (let vertex of ground.slice(0, 4)) {
            context.lineTo(...vertex);
        }
        context.strokeStyle = "rgb(255, 255, 255)";
        context.stroke();
        context.closePath();

        context.beginPath();
        context.moveTo(...ground[7]);
        for (let vertex of ground.slice(4, 8)) {
            context.lineTo(...vertex);
        }
        context.strokeStyle = "rgb(128, 128, 128)";
        context.stroke();
        context.closePath();

        for (let partical of this.list) {
            if (not_static) {
                partical.move();
            }
            partical.draw();
        }

        if (drawing_field) {
            draw_field(parseInt(-width / 2), parseInt(-height / 2), parseInt(width / 2), parseInt(height / 2), -depth / 2, 0);
        }
    }

    update_partical(partical) {
        let ddx = [0, 0, 0];
        for (let other_partical of this.list) {
            if (partical === other_partical) {
                continue;
            }
            let delta_x = [
                other_partical.x[0] - partical.x[0],
                other_partical.x[1] - partical.x[1],
                other_partical.x[2] - partical.x[2]
            ];
            let r = Math.sqrt(norm(delta_x));
            let f = force(
                r / force_range,
                factor_matrix[partical.color_index][other_partical.color_index]
            );
            let k = f  / (r || 1);
            ddx[0] += k * delta_x[0];
            ddx[1] += k * delta_x[1];
            ddx[2] += k * delta_x[2];
        }
        if (partical.x[0] < -width / 2 || partical.x[0] >= width / 2) {
            ddx[0] -= partical.x[0] / (width || 1) ;
        }
        if (partical.x[1] < -height / 2 || partical.x[1] >= height / 2) {
            ddx[1] -= partical.x[1] / (height || 1);
        }
        if (partical.x[2] < -depth / 2 || partical.x[2] >= depth / 2) {
            ddx[2] -= partical.x[2] / (depth || 1);
        }
        partical.dx[0] = decay * partical.dx[0] + (ddx[0] || 0);
        partical.dx[1] = decay * partical.dx[1] + (ddx[1] || 0);
        partical.dx[2] = decay * partical.dx[2] + (ddx[2] || 0);
    }

    update() {
        this.list.forEach(this.update_partical.bind(this));
        this.display(true);
    }

    resize() {
        let diff = quantity - this.list.length;
        if (diff < 0) {
            this.list.splice(quantity, -diff);
            return;
        }
        for (let i = 0; i < diff; ++i) {
            this.list.push(new Partical());
        }
    }

    adjust_to_variety() {
        let diff = variety - factor_matrix.length;
        if (diff < 0) {
            partical_colors.splice(variety, -diff);
            factor_matrix.splice(variety, -diff);
            factor_matrix.forEach(row => row.splice(variety, -diff));
            this.list = this.list.filter(partical => partical.color_index < variety);
        } else {
            partical_colors.push(...get_random_colors(diff));
            factor_matrix.forEach(row => {
                for (let j = 0; j < diff; ++j) {
                    row.push(Math.random() * 2 - 1);
                }
            });
            for (let i = factor_matrix.length; i < variety; ++i) {
                factor_matrix.push(new Array(variety));
                for (let j = 0; j < variety; ++j) {
                    factor_matrix[i][j] = Math.random() * 2 - 1;
                }
            }
        }
        this.resize();
    }
};

// Partical movement relative end

var epoch = {
    start() {
        partical_colors = get_random_colors(variety);
        factor_matrix = make_factor_matrix();
        this.particals = new ParticalList(quantity);
        this.interval_ids =[];
    },
    suspend() {
        this.interval_ids.forEach(clearInterval);
    },
    play() {
        const zone_size = 1024;
        for (let zone_index = 0; zone_index < Math.ceil(quantity / zone_size); ++zone_index) {
            this.interval_ids.push(setInterval(() => {
                for (let partical_index = zone_index * zone_size; partical_index < (zone_index + 1) * zone_size; ++partical_index) {
                    try {
                        this.particals.update_partical(this.particals.list[partical_index]);
                    } catch (error) {
                        if (partical_index < quantity) {
                            this.particals.list[partical_index] = new Partical();
                        }
                    }
                }
                this.particals.display(true);
            }, elapse));
        }
    }
};
epoch.start();
epoch.play();

let aSelf = 1, aAdjoin = 0.5, aApart = -0.5;
factor_matrix = Array.from(new Array(variety)).map((() => {
    let temp = [aApart, aAdjoin, aSelf, aAdjoin, aApart].concat(...Array.from(new Array(variety - 5)).map(() => 0));
    // temp = temp.slice(2).concat(temp.slice(0, 2));
    return () => {
        let row = temp;
        temp = temp.slice(-1).concat(temp.slice(0, -1));
        return row;
    };
    
})());
// epoch.particals.list = Array.from(new Array(quantity)).flatMap((value, index) => new Partical(Math.floor(index * variety / quantity)));
