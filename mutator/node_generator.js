var esprima = require('esprima');
var escope = require('escope');
var estraverse = require('estraverse');
var escodegen = require('escodegen');

// https://esprima.readthedocs.io/en/latest/syntax-tree-format.html - вся инфа по возможным нодам

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

//./data-set/basic/testincops.js 0
// ./data-set/basic/doMath.js 0
// ./data-set/basic/testMulOverflow.js 0
// ./data-set/basic/testSwitchString.js 1
// ./data-set/basic/bug686296.js 0 где не работает scope.

// ./data-set/basic/testPrimitiveConstructorPrototype.js 2


function __get_node(ast, aimed_type, index) {
    var res_nodes = []
    estraverse.traverse(ast, {
        enter: function (node, parent) {
            if (node.type == aimed_type) {
                res_nodes.push(node);
            }
        },
        leave: function (node, parent) {
        }
    });

    if (!index) {
        index = Math.floor(Math.random() * res_nodes
        .length);
        };

        console.log("index:", index);
        return [res_nodes[index], ast];
}

function getNode(aimed_type) {
    while (true){ 
        var tree_file = "./data-set/basic/" + randomChoice(trees);
        var code = fs.readFileSync(tree_file, "utf-8");

        try {
            var ast = esprima.parse(code);
        } catch(e) {
            continue
        }
        console.log(tree_file);
        var [new_node, source_tree] = __get_node(ast, aimed_type);
        if (new_node) {
            return [new_node, source_tree];
        }
        continue;
    }   
}

function getSpecifiedNode(tree_file, node_index, aimed_type) {
    var code = fs.readFileSync(tree_file, "utf-8");
    var ast = esprima.parse(code);

    return __get_node(ast, aimed_type, node_index);
}

function check_variable_existence(var_array, varname) {
    for(var i = 0; i < var_array.length; i++) {
        if (var_array[i].name == varname) {
            return true;
        }
    }
    return false;
}

function extract_variable_names(var_map, var_array) {
    for(var i = 0; i < var_array.length; i++) {
        var_map.set(var_array[i].name, 1);
    }
}

function delete_variables_name(var_map, var_array) {
    for(var i = 0; i < var_array.length; i++) {
        var_map.delete(var_array[i].name);
    }
}

// mutate_blocks replaces blocks:
// "ForStatement":
// "ForInStatement":
// "IfStatement":
// "DoWhileStatement":
// "SwitchStatement":
// "WhileStatement":
// "WithStatement":
// "BlockStatement":
//
// It queries new block with the same type from the given data-set.
function mutate_blocks(ast) {
    var scopeManager = escope.analyze(ast);

    var current_variables = new Map();

    var in_function = false;
    
    var is_need_refresh_scope_manager = false;
    var variables_to_delete = [];

    estraverse.replace(ast, {
        enter: function (node, parent) {
            if(is_need_refresh_scope_manager) {
                scopeManager = escope.analyze(ast);
                is_need_refresh_scope_manager = false;
            }

            if (/Function/.test(node.type)) {
                in_function = true;
            }

            // skip function names -_0_0_-.
            if (in_function && !/Function/.test(node.type)) {
                variables_to_delete = variables_to_delete.concat(scopeManager.getDeclaredVariables(node));
            }
            
            extract_variable_names(current_variables, scopeManager.getDeclaredVariables(node));
            switch (node.type) {
                case "ForStatement":
                case  "ForInStatement":
                case  "IfStatement":
                case  "DoWhileStatement":
                case  "SwitchStatement":
                case  "WhileStatement":
                case  "WithStatement": break;
                //case  "BlockStatement": break; // Нужен ли нам блок стейтмент?
                default: return;
            }

          //  switch (Math.random()%2) {
            //    case 0: return
              //  case 1: // generate
            //}
            
            var [new_node, source_tree] = getSpecifiedNode("./data-set/basic/testNegZero1.js", 0, node.type);
            var sourceScopeManager = escope.analyze(source_tree);

           // var [new_node, source_tree] = getNode(node.type);

            // change variables name in new node if they are not declarated to the declarated variables:
            // it can be:
            // - global variable from mutated ast
            // - variable which are accsessible for the current context(visible in a function and global variables)
            // 
            // OR leave variable name if it is declarated in new node
            //
            // 
            // Если мы идем вглубь дерева, а мы идем вглубь, то видимость переменных сохраняется,
            // просто добавляются новые.
            // Видимость переменных в джава-скрипт ограничивается только функциями.
            // https://habr.com/ru/post/78991/
            //
            new_node_variables = new Map();
            estraverse.traverse(new_node, {
                enter: function (node, parent) {
                    // returns list of variables which are declarated in a node.
                    // See https://github.com/estools/escope/blob/49a00b8b41c8d6221446bbf6b426d1ea64d80d00/src/scope-manager.js#L98
                    extract_variable_names(new_node_variables, sourceScopeManager.getDeclaredVariables(node));
                    if (node.object) {
                        if (node.object.type == "Identifier") {
                            if (!current_variables.get(node.object.name) && !new_node_variables.get(node.object.name)) {
                                node.object.name = randomChoice(Array.from(current_variables.keys()));
                            };
                        }
                    }
                    if (node.left) {
                        if (node.left.type == "Identifier") {

                            if (!current_variables.get(node.left.name) && !new_node_variables.get(node.left.name)) {
                                node.left.name = randomChoice(Array.from((current_variables.keys())));
                            };
                        }
                    }
                    if (node.right) {
                        if (node.right.type == "Identifier") {
                            if (!current_variables.get(node.right.name) && !new_node_variables.get(node.right.name)) {
                                node.right.name = randomChoice(Array.from(current_variables.keys()));
                            };
                        }
                    }
                    if (node.argument) {
                        if (node.argument.type == "Identifier") {
                            if (!current_variables.get(node.argument.name) && !new_node_variables.get(node.argument.name)) {
                                node.argument.name = randomChoice(Array.from(current_variables.keys()));
                            };
                        } 
                    }
                },
                leave: function (node, parent) {}
            });

            is_need_refresh_scope_manager = true;
            return new_node;
        }, 
        leave: function (node, parent) {  
            // delete variables which are declarated in node.
            if (/Function/.test(node.type)) {
                delete_variables_name(current_variables, variables_to_delete);
                variables_to_delete = [];
                in_function = false;
            }
        },
    })
}

let binary_operator = ['+','-','*','/','%','**','&','|','^','<<','>>','>>>']; // Math operator
let binary_condition = ['==','!=','<','<=','>','>=','===','!==','instanceof','in']; // condition operator
let assign_operator = ['+=','-=','*=','**=','/=','%=','&=','^=','|=','<<=','>>=','>>>=','='];
let boolean_value = ['false','true'];
let unary_operator = ['~','-','!','++','--','+','']; // '...' 'typeof'
let update_operator = ['++','--'];
let logical_operator = ['&&','||'];

// mutate_expressions just changes one simple expression to another one.
function mutate_expressions(ast, scopeManager) {
    estraverse.traverse(ast, {
        enter: function (node, parent) {
            switch(node.type) {
                case "BinaryExpression": node.operator = randomChoice(binary_operator);
                case "LogicalExpression": node.operator = randomChoice(logical_operator);
                case "AssignmentExpression": node.operator = randomChoice(assign_operator);
                case "UnaryExpression":  node.operator = randomChoice(unary_operator);
                case "UpdateExpression": node.operator = randomChoice(update_operator);
            }
        },
        leave: function (node, parent) {
        }
    });
};

module.exports = {
    mutate_code: mutate_code,
};

function mutate_code(code) {
    var ast = esprima.parse(code);
    mutate_blocks(ast);
    return escodegen.generate(ast);
}

var fs = require("fs");
data_set_dir = "./data-set/basic"
var trees = fs.readdirSync(data_set_dir);

var seed_file = process.argv[2];
var raw = fs.readFileSync(seed_file, "utf-8");
mutated_code = mutate_code(raw);

console.log("========MUTATED CODE ============");
console.log(mutated_code);