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

// ./data-set/basic/joinTest.js index: 2



class NodeReplacer {
    constructor(ast) {
        this.ast = ast;
        this.scopeManager = escope.analyze(this.ast);

        this.in_function = false; // TODO I think we need an array of function because of nested functions.
        this.in_loop = false;
        this.is_switch = false;

        // Helps to control variables.
        this.global_variables = new Map();
        this.function_variables = new Map();
        this.new_node_variables = new Map();
        this.is_need_refresh_scope_manager = false;
        this.variables_to_delete = [];
    }

    __extract_variable_names(var_map, var_array) {
        for(var i = 0; i < var_array.length; i++) {
            var_map.set(var_array[i].name, 1);
        }
    }

    extract_global_variables(var_array) {
        this.__extract_variable_names(this.global_variables, var_array);
    }

    extract_function_variables(var_array) {
        this.__extract_variable_names(this.function_variables, var_array);
    }

    extract_new_node_varibles(var_array) {
        this.__extract_variable_names(this.new_node_variables, var_array);
    }

    free_function_variables() {
        this.function_variables = new Map();
    }

    free_new_node_variables() {
        this.new_node_varibles = new Map();
    }

    free_variables(var_array) {
        var self = this;
        for(var i = 0; i < var_array.length; i++) {
            self.global_variables.set(var_array[i].name, 1);
        }
    }

    var_is_exists(name) {
        if (this.global_variables.get(name)) {
            return true;
        }
        if (this.new_node_variables.get(name)) {
            return true;
        }
        if (this.function_variables.get(name)) {
            return true;
        }
        return false;
    }

    rand_variable_name() {
        var merged = new Map([...this.global_variables, ...this.new_node_variables, ...this.function_variables]);
        return randomChoice(Array.from(merged.keys()))
    }
    
    __get_node(ast, aimed_type, index) {
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

    getNode(aimed_type) {
        var self = this;

        while (true) { 
            var tree_file = "./data-set/basic/" + randomChoice(trees);
            var code = fs.readFileSync(tree_file, "utf-8");

            try {
                var ast = esprima.parse(code);
            } catch(e) {
                continue
            }
            console.log(tree_file);
            var [new_node, source_tree] = self.__get_node(ast, aimed_type);
            if (new_node) {
                return [new_node, source_tree];
            }
            continue;
        }
    }

    getSpecifiedNode(tree_file, node_index, aimed_type) {
        var self = this;

        var code = fs.readFileSync(tree_file, "utf-8");
        var ast = esprima.parse(code);

        return self.__get_node(ast, aimed_type, node_index);
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
    mutate_blocks() {
        var self = this;

        estraverse.replace(self.ast, {
            enter: function (node, parent) {
                if(self.is_need_refresh_scope_manager) {
                    self.scopeManager = escope.analyze(self.ast);
                    self.is_need_refresh_scope_manager = false;
                }

                if (/Function/.test(node.type)) {
                    self.in_function = true;
                }

                // skip function names -_0_0_-.
                if (self.in_function && !/Function/.test(node.type)) {
                    self.extract_function_variables(self.scopeManager.getDeclaredVariables(node));
                } else {
                    self.extract_global_variables(self.scopeManager.getDeclaredVariables(node));
                }            

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
                
                // var [new_node, source_tree] = self.getSpecifiedNode("./data-set/basic/joinTest.js", 2, node.type);
                var [new_node, source_tree] = self.getNode(node.type);
                var sourceScopeManager = escope.analyze(source_tree);

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
                estraverse.traverse(new_node, {
                    enter: function (node, parent) {
                        // returns list of variables which are declarated in a node.
                        // See https://github.com/estools/escope/blob/49a00b8b41c8d6221446bbf6b426d1ea64d80d00/src/scope-manager.js#L98
                        self.extract_new_node_varibles(sourceScopeManager.getDeclaredVariables(node));
                        if (node.object) {
                            if (node.object.type == "Identifier") {
                                if (!self.var_is_exists(node.object.name)) {
                                    node.object.name = self.rand_variable_name();
                                };
                            }
                        }
                        if (node.left) {
                            if (node.left.type == "Identifier") {
                                if (!self.var_is_exists(node.left.name)) {
                                    node.left.name = self.rand_variable_name();
                                };
                            }
                        }
                        if (node.right) {
                            if (node.right.type == "Identifier") {
                                if (!self.var_is_exists(node.right.name)) {
                                    node.right.name = self.rand_variable_name();
                                };
                            }
                        }
                        if (node.argument) {
                            if (node.argument.type == "Identifier") {
                                if (!self.var_is_exists(node.argument.name)) {
                                    node.argument.name = self.rand_variable_name();
                                };
                            } 
                        }
                        if (node.property) { // ?? a[i] i - это будет проперти, что делать с тем, что он свойства начал у всех заменять -_-
                            if (node.property.type == "Identifier") {
                                if (!self.var_is_exists(node.property.name)) {
                                    node.property.name = self.rand_variable_name();
                                };
                            } 
                        }
                    },
                    leave: function (node, parent) {}
                });
                self.free_new_node_variables();
                self.is_need_refresh_scope_manager = true;
                return new_node;
            }, 
            leave: function (node, parent) {  
                // delete variables which are declarated in node.
                if (/Function/.test(node.type)) {
                    self.free_function_variables();
                    self.in_function = false;
                }
            },
        })
    }
    get_mutated_code() {
        return escodegen.generate(this.ast);
    }
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

    node_replacer = new NodeReplacer(ast);
    node_replacer.mutate_blocks();
    return node_replacer.get_mutated_code();
}

var fs = require("fs");
data_set_dir = "./data-set/basic"
var trees = fs.readdirSync(data_set_dir);

var seed_file = process.argv[2];
var raw = fs.readFileSync(seed_file, "utf-8");
mutated_code = mutate_code(raw);

console.log("========MUTATED CODE ============");
console.log(mutated_code);