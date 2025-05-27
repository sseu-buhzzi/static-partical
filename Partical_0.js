var canvas = document.getElementById("partical");
var context = canvas.getContext("2d");

var equilibrium = 0.25;
var force_range = 128;
var decay = 0.5;

var width = 1024;
var height = 768;
var depth = 64;

var quantity = 512;
var elapse = 16;

var version_cone = 60;

function resize_canvas() {
    canvas.width = canvas.height = Math.max(width, height, depth, 1024);
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
    return HIGH_COTRAST_COLOR.sort(() => Math.random() - 0.5).slice(0, count);
}
var partical_colors = get_random_colors(4);
// partical_colors.push(...RAINBOW_COLORS);
// for (let i = 0; i < 2; ++i) {
// let red = Math.random() * 128;
// let green = Math.random() * 128;
// let blue = Math.max(128 - red - green, 0);
// partical_colors.push(`rgb(${128 + red}, ${128 + green}, ${128 + blue})`, `rgb(${255 - red}, ${255 - green}, ${255 - blue})`);
// }
// partical_colors.push("#ff8000", "#0080ff");

var factor_matrix = new Array(partical_colors.length);
for (let i = 0; i < factor_matrix.length; ++i) {
    factor_matrix[i] = [];
    for (let j = 0; j < partical_colors.length; ++j) {
        factor_matrix[i].push(Math.random() * 2 - 1);
    }
}
// for (let i = 0; i < factor_matrix.length; ++i) {
//     for (let j = 0; j < factor_matrix[0].length; ++j) {
//         factor_matrix[i][j] = i === j ? -0.5 : 1;
//     }
// }

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

const camera = {
    phi: 180,
    theta: 90,
    rho: 1024,
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
        const zoom = 180 / (Math.PI * version_cone);
        let khi = Math.atan2(ortho[0], ortho[2]);
        let upsilon = Math.atan2(ortho[1], ortho[2]);
        return [(zoom * khi + 0.5) * canvas.width, (zoom * upsilon + 0.5) * canvas.height];
    }
};

function document_keydown(event) {
    switch(event.key) {
        case "ArrowUp": {
            camera.longitudinal_move(1);
            break;
        }
        case "ArrowRight": {
            camera.lateral_move(1);
            break;
        }
        case "ArrowDown": {
            camera.longitudinal_move(-1);
            break;
        }
        case "ArrowLeft": {
            camera.lateral_move(-1);
            break;
        }
        case "Enter": {
            camera.orthographic = !camera.orthographic;
            break;
        }
    }
}

var cursor_pos = [0, 0];
var cursor_dragging = false;
function canvas_mousedown(event) {
    cursor_pos[0] = event.x;
    cursor_pos[1] = event.y;
    cursor_dragging = true;
}
function canvas_mouseup() {
    cursor_dragging = false;
}
function canvas_mousemove(event) {
    if (cursor_dragging) {
        camera.lateral_move(cursor_pos[0] - event.x);
        camera.longitudinal_move(event.y - cursor_pos[1]);
        cursor_pos[0] = event.x;
        cursor_pos[1] = event.y;
    }
}
function canvas_wheel(event) {
    camera.radial_move(event.deltaY);
}

canvas.addEventListener("mousedown", canvas_mousedown);
document.addEventListener("mouseup", canvas_mouseup);
document.addEventListener("mousemove", canvas_mousemove);
canvas.addEventListener("wheel", canvas_wheel);
document.addEventListener("keydown", document_keydown);

class Partical{
    constructor(color_index, x) {
        this.color_index = color_index ?? Math.floor(Math.random() * partical_colors.length);
        this.x = x ?? [width, height, depth].map(value => Math.floor(Math.random() * value - value / 2));
        this.dx = [0, 0, 0];
    }

    draw() {
        context.beginPath();
        context.arc(...camera.projection(this.x), 2, 0, 2 * Math.PI);
        context.fillStyle = partical_colors[this.color_index];
        context.fill();
        context.closePath();
    }

    move() {
        for (let dim = 0; dim < this.x.length; ++dim) {
            this.x[dim] += this.dx[dim];
        }
    }
};

function force(r, a) {
    if (r < equilibrium) {
        return r / equilibrium - 1;
    }
    if (r < 1) {
        return a * (1 - Math.abs(2 * r - equilibrium - 1) / (1 - equilibrium));
    }
    return 0;
}

class ParticalList{
    constructor() {
        this.list = [];
        for (let i = 0; i < quantity ?? 0; ++i) {
            this.list.push(new Partical());
        }
    }

    update() {
        for (let partical of this.list) {
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
                if (r > force_range) {
                    continue;
                }
                let f = force(
                    r / force_range,
                    factor_matrix[partical.color_index][other_partical.color_index]
                );
                let k = f / r;
                ddx[0] += k * delta_x[0];
                ddx[1] += k * delta_x[1];
                ddx[2] += k * delta_x[2];
            }
            if (partical.x[0] + width / 2 < 0 || partical.x[0] - width / 2 >=  0) {
                ddx[0] -= partical.x[0] / (width || 1);
            }
            if (partical.x[1] + height / 2 < 0 || partical.x[1] - height / 2 >= 0) {
                ddx[1] -= partical.x[1] / (height || 1);
            }
            if (partical.x[2] + depth / 2 < 0 || partical.x[2] - depth / 2 >= 0) {
                ddx[2] -= partical.x[2] / (depth || 1);
            }
            partical.dx[0] = decay * partical.dx[0] + ddx[0] ?? 0;
            partical.dx[1] = decay * partical.dx[1] + ddx[1] ?? 0;
            partical.dx[2] = decay * partical.dx[2] + ddx[2] ?? 0;
        }

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
            partical.move();
            partical.draw();
        }
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
};

var epoch = {
    start() {
        this.particals = new ParticalList(quantity);
    },

    suspend() {
        clearInterval(this.interval_id);
    },

    play() {
        this.interval_id = setInterval(() => this.particals.update(), elapse);
    }
};
epoch.start();
epoch.play();
