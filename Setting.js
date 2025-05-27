const geal = document.getElementById("geal");
let in_setting = false;

function add_adjusting_listener(node, adjust_up, adjust_down, step, change_listener) {
    function adjust_up_mouseup() {
        node.value = parseFloat(node.value) + step;
        change_listener();
    }
    function adjust_down_mouseup() {
        node.value = parseFloat(node.value) - step;
        change_listener();
    }
    adjust_up.addEventListener("mouseup", adjust_up_mouseup);
    adjust_down.addEventListener("mouseup", adjust_down_mouseup);
}

function geal_mouseenter() {
    const curtain_template = document.getElementById("curtain-template");
    const curtain = document.importNode(curtain_template.content, true);
    document.body.appendChild(curtain);
    document.removeEventListener("keydown", document_keydown);

    const equilibrium_modification = document.getElementById("equilibrium-modification");
    const equilibrium_textarea = document.getElementById("equilibrium-textarea");
    equilibrium_textarea.value = equilibrium;
    function equilibrium_change_listener() {
        equilibrium = parseFloat(equilibrium_textarea.value) ?? 0.25;
    }
    equilibrium_textarea.addEventListener("change", equilibrium_change_listener);
    add_adjusting_listener(equilibrium_textarea, ...equilibrium_modification.querySelectorAll("button"), 0.01, equilibrium_change_listener);

    const force_range_modification = document.getElementById("force-range-modification");
    const force_range_textarea = document.getElementById("force-range-textarea");
    force_range_textarea.value = force_range;
    function force_range_change_listener() {
        force_range = parseFloat(force_range_textarea.value) ?? 128;
    }
    force_range_textarea.addEventListener("change", force_range_change_listener);
    add_adjusting_listener(force_range_textarea, ...force_range_modification.querySelectorAll("button"), 16, force_range_change_listener);

    const decay_modification = document.getElementById("decay-modification");
    const decay_textarea = document.getElementById("decay-textarea");
    decay_textarea.value = decay;
    function decay_change_listener() {
        decay = parseFloat(decay_textarea.value) ?? 0.5;
    }
    decay_textarea.addEventListener("change", decay_change_listener);
    add_adjusting_listener(decay_textarea, ...decay_modification.querySelectorAll("button"), 0.01, decay_change_listener);

    const width_modification = document.getElementById("width-modification");
    const width_textarea = document.getElementById("width-textarea");
    width_textarea.value = width;
    function width_change_listener() {
        width = parseInt(width_textarea.value) ?? 1024;
        resize_canvas();
    }
    width_textarea.addEventListener("change", width_change_listener);
    add_adjusting_listener(width_textarea, ...width_modification.querySelectorAll("button"), 64, width_change_listener);

    const height_modification = document.getElementById("height-modification");
    const height_textarea = document.getElementById("height-textarea");
    height_textarea.value = height;
    function height_change_listener() {
        height = parseInt(height_textarea.value) ?? 768;
        resize_canvas();
    }
    height_textarea.addEventListener("change", height_change_listener);
    add_adjusting_listener(height_textarea, ...height_modification.querySelectorAll("button"), 64, height_change_listener);

    const depth_modification = document.getElementById("depth-modification");
    const depth_textarea = document.getElementById("depth-textarea");
    depth_textarea.value = depth;
    function depth_change_listener() {
        depth = parseInt(depth_textarea.value) ?? 64;
        resize_canvas();
    }
    depth_textarea.addEventListener("change", depth_change_listener);
    add_adjusting_listener(depth_textarea, ...depth_modification.querySelectorAll("button"), 64, depth_change_listener);

    const quantity_modification = document.getElementById("quantity-modification");
    const quantity_textarea = document.getElementById("quantity-textarea");
    quantity_textarea.value = quantity;
    function quantity_change_listener() {
        quantity = parseInt(quantity_textarea.value);
        if (quantity == null || quantity < 0) {
            quantity = 0;
        }
        epoch.particals.resize(quantity);
    }
    quantity_textarea.addEventListener("change", quantity_change_listener);
    add_adjusting_listener(quantity_textarea, ...quantity_modification.querySelectorAll("button"), 64, quantity_change_listener);

    const partical_population = document.getElementById("partical-population");
    for (let i = 0; i < partical_colors.length; ++i) {
        const partical_detail = document.createElement("div");
        partical_detail.className = "modification";
        partical_detail.innerHTML = `
            <span style = "width: 16px; height: 16px; background-color: ${partical_colors[i]};"></span>
            <textarea id = "partical${i}-textarea"></textarea>
            <div class = "adjust"><button><div>▴</div></button><button><div>▾</div></button></div>
        `;
        partical_population.appendChild(partical_detail);

        const population_textarea = document.getElementById(`partical${i}-textarea`);
        population_textarea.value = epoch.particals.list.filter(partical => partical.color_index === i).length;
        function population_change_listener() {
            let population = population_textarea.value;
            epoch.particals.list = epoch.particals.list.filter(partical => partical.color_index !== i || --population >= 0);
            while (--population >= 0) {
                epoch.particals.list.push(new Partical(i));
            }
            quantity_textarea.value = epoch.particals.list.length;
        }
        population_textarea.addEventListener("change", population_change_listener);
        add_adjusting_listener(population_textarea, ...partical_detail.querySelectorAll("button"), 64, population_change_listener);
    }

    const elapse_modification = document.getElementById("elapse-modification");
    const elapse_textarea = document.getElementById("elapse-textarea");
    elapse_textarea.value = elapse;
    function elapse_change_listener() {
        elapse = parseInt(elapse_textarea.value);
        if (elapse == null || elapse < 0) {
            elapse = 0;
        }
        if (epoch.interval_id !== null) {
            epoch.suspend();
            epoch.play();
        }
    }
    elapse_textarea.addEventListener("change", elapse_change_listener);
    add_adjusting_listener(elapse_textarea, ...elapse_modification.querySelectorAll("button"), 16, elapse_change_listener);

    const variety_modification = document.getElementById("variety-modification");
    const variety_textarea = document.getElementById("variety-textarea");
    variety_textarea.value = variety;
    function variety_change_listener() {
        variety = parseInt(variety_textarea.value);
        if (variety == null || variety <= 0) {
            variety = 1;
        }
        epoch.particals.adjust_to_variety();
    }
    variety_textarea.addEventListener("change", () => variety_change_listener());
    add_adjusting_listener(variety_textarea, ...variety_modification.querySelectorAll("button"), 1, variety_change_listener);

    const factor_matrix_modification = document.getElementById("factor-matrix-modification");
    const factor_matrix_textarea = document.getElementById("factor-matrix-textarea");
    factor_matrix_modification.querySelector("button").addEventListener("mouseup", () => {
        if (factor_matrix_textarea.style.display === "") {
            factor_matrix_modification.querySelector("path").setAttribute("d", "M2, 6 L10, 6");
            factor_matrix_textarea.style.display = "block";
            factor_matrix_textarea.value = JSON.stringify(factor_matrix, null, 4);
            factor_matrix_textarea.style["height"] = `${factor_matrix_textarea.scrollHeight}px`;
        } else {
            factor_matrix_modification.querySelector("path").setAttribute("d", "M2, 6 L10, 6 M 6, 2 L6, 10");
            factor_matrix_textarea.style.display = "";
        }
    });
    factor_matrix_textarea.addEventListener("change", () => {
        let matrix = JSON.parse(factor_matrix_textarea.value);
        if (matrix.length !== factor_matrix.length) {
            return;
        }
        for (let i = 0; i < matrix.length; ++i) {
            if (matrix[i].length !== factor_matrix.length) {
                return;
            }
        }
        factor_matrix = matrix;
    });

    const vision_cone_modification = document.getElementById("vision-cone-modification");
    const vision_cone_textarea = document.getElementById("vision-cone-textarea");
    vision_cone_textarea.value = vision_cone;
    function vision_cone_change_listener() {
        vision_cone = parseInt(vision_cone_textarea.value) ?? 30;
    }
    vision_cone_textarea.addEventListener("change", vision_cone_change_listener);
    add_adjusting_listener(vision_cone_textarea, ...vision_cone_modification.querySelectorAll("button"), 1, vision_cone_change_listener);

    const coord_modification = document.getElementById("coordinary-modification");
    const coord_textareas = [0, 1, 2].map(value => document.getElementById(`coord${value}-textarea`));
    const coord_adjusts = coord_modification.querySelectorAll("button");
    for (let dim = 0; dim < 3; ++dim) {
        coord_textareas[dim].value = camera.coord[dim];
        function coord_change_listener() {
            camera.coord[dim] = parseFloat(coord_textareas[dim].value) ?? 0;
        }
        coord_textareas[dim].addEventListener("change", coord_change_listener);
        add_adjusting_listener(coord_textareas[dim], coord_adjusts[2 * dim], coord_adjusts[2 * dim + 1], 64, coord_change_listener);
    }
}

function geal_mouseleave() {
    const curtain = document.querySelector(".curtain:not(template > .curtain)");
    if (curtain == null) {
        return;
    }
    document.body.removeChild(curtain);
    document.addEventListener("keydown", document_keydown);
}

geal.addEventListener("mouseenter", () => {
    if (!in_setting) {
        geal_mouseenter();
    }
});
geal.addEventListener("mouseleave", () => {
    if (!in_setting) {
        geal_mouseleave();
    }
});
geal.addEventListener("mousedown", () => {
    if (in_setting) {
        geal_mouseleave();
    }
    in_setting = !in_setting;
});

const suspend_or_play = document.getElementById("suspend-or-play");
function suspend_or_play_mousedown() {
    if (suspend_or_play.querySelector("polygon") == null) {
        suspend_or_play.innerHTML = `
            <polygon points = "24, 18 24, 46 48, 32" stroke = "rgb(255, 255, 255)"/>
        `;
        epoch.suspend();
    } else {
        suspend_or_play.innerHTML = `
            <rect class = "left" x = "20" y = "16" width = "8" height = "32" stroke = "rgb(255, 255, 255)"/>
            <rect class = "right" x = "36" y = "16" width = "8" height = "32" stroke = "rgb(255, 255, 255)"/>
        `;
        epoch.play();
    }
}
suspend_or_play.addEventListener("mousedown", suspend_or_play_mousedown);

const clear = document.getElementById("clear");
function clear_mousedown() {
    let is_playing = suspend_or_play.querySelector("polygon") == null;
    if (is_playing) {
        epoch.suspend();
    }
    epoch.start();
    if (is_playing) {
        epoch.play();
    }
}
clear.addEventListener("mousedown", clear_mousedown);

const field = document.getElementById("field");
function field_mousedown() {
    drawing_field = !drawing_field;
}
field.addEventListener("mousedown", field_mousedown);

const direction = document.getElementById("direction");
const direction_keys = document.querySelector(".direction-keys");
function direction_mousedown() {
    if (direction_keys.style.display === "none") {
        direction_keys.style.display = "grid";
    } else {
        direction_keys.style.display = "none";
    }
}
direction.addEventListener("mousedown", direction_mousedown);
