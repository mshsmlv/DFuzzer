var esprima = require('esprima');
var escope = require('escope');
var estraverse = require('estraverse');
var escodegen = require('escodegen');
var esquery = require('esquery');

// https://esprima.readthedocs.io/en/latest/syntax-tree-format.html - вся инфа по возможным нодам

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

//./data-set/basic/testincops.js 0
// ./data-set/basic/doMath.js 0
// ./data-set/basic/testMulOverflow.js 0
// ./data-set/basic/testSwitchString.js 1
// ./data-set/basic/testPrimitiveConstructorPrototype.js 2
// ./data-set/basic/joinTest.js index: 2

class NodeReplacer {
    constructor(ast) {
        this.ast = ast;
        this.scopeManager = escope.analyze(this.ast);

        this.in_loop = false;
        this.in_switch = false;

        // Helps to control variables.
        this.global_variables = new Map();
        this.function_variables = new Map();
        this.new_node_variables = new Map();
        this.is_need_refresh_scope_manager = false;

        // we can have nested function declarations and leaving function context not garantee that we left function.
        this.function_stack = []; // [fun_name1, fun_name2], just to debug
        this.prev_scope = []; // [map1{}, map2{}],  stores previous scopes to restore scope of wrapper

        // it collects new objects from sources during mutating.
        this.nodes_to_insert = new Map()
    }

    in_function() {
        if (this.function_stack.length > 0) {
            return true;
        }
        return false;
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
        this.function_variables = this.prev_scope.pop();
        if (!this.function_variables) {
            this.function_variables = new Map();
        }

        this.function_stack.pop();
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

    var_exists(name) {
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
        var merged = new Map([
            ...this.global_variables, 
            ...this.new_node_variables, 
            ...this.function_variables
        ]);
        return randomChoice(Array.from(merged.keys()))
    }

    // it skipes nodes which are not applicable for the current context.
    __node_is_applicable(node) {
        var self = this;
        var is_applicable = true;
        estraverse.traverse(node, {
            enter: function (node, parent) {
                switch (node.type) {
                    case 'BreakStatement':
                        if (!self.in_loop && !self.in_switch) {
                            is_applicable = false;
                        };
                        break;
                    case 'ReturnStatement':
                        if (!self.in_function()) {
                            is_applicable = false;
                        }
                    case 'ContinueStatement':
                        if (!self.in_loop) {
                            is_applicable = false;
                        }
                }
            },
            leave: function (node, parent) {}
        })
        return is_applicable;
    }
    
    // it gets applicable node for the current context with @aimed_type.
    // if @index is set it will return all_applicable_nodes_from_ast[index].
    // if @index is not set it will return all_applicable_nodes_from_ast[random_index].
    __get_node(ast, aimed_type, index) {
        var self = this;
        var res_nodes = []
        estraverse.traverse(ast, {
            enter: function (node, parent) {
                if (node.type == aimed_type && self.__node_is_applicable(node)) {
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

    // just for debug. It gets a node from a specified tree with the specified index.
    getSpecifiedNode(tree_file, node_index, aimed_type) {
        var self = this;

        var code = fs.readFileSync(tree_file, "utf-8");
        var ast = esprima.parse(code);

        return self.__get_node(ast, aimed_type, node_index);
    }

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
    //
    // отслеживать "CallExpression" тип и затягивать функции в мутируемое дерево, если она не объявлена.
    // Для этого нужно отслеживать глобальные функции, которые объявлены. Если ее нет в этом массиве(или что это есть),
    // то вставляем.
    prepare_node_for_insertion(new_node, source_tree) {
        var self = this;
        var sourceScopeManager = escope.analyze(source_tree);

        estraverse.traverse(new_node, {
            enter: function (node, parent) {
                // returns list of variables which are declarated in a node.
                // See https://github.com/estools/escope/blob/49a00b8b41c8d6221446bbf6b426d1ea64d80d00/src/scope-manager.js#L98
                self.extract_new_node_varibles(sourceScopeManager.getDeclaredVariables(node));

                if (parent) {
                    // it means we are in a function call.
                    // if calling function not in the tree, try to extraxt this node from source tree.
                    if (node.type == "Identifier" && parent.type == "CallExpression") {
                        if (self.nodes_to_insert.get(node.name)) {
                            return;
                        }
                        var selector = `[type="FunctionDeclaration"][id.name="${node.name}"]`;
                        if (esquery.query(self.ast, selector).length == 0) {
                            var node_from_source = esquery.query(source_tree, selector)
                            if (node_from_source.length > 0) {
                                self.nodes_to_insert.set(
                                    node.name, 
                                    {
                                        node: node_from_source[0], 
                                        source: source_tree
                                    }
                                );
                            }
                        }
                        return // do not replace function calls.
                    }

                    // we are in `new MyClass()` construction.
                    if (node.type == "Identifier" && parent.type == "NewExpression") {
                        switch (node.name) {
                            case "Map": return;
                            case "Set": return;
                            case "Array": return; // Skip standard classes. TODO: Add other standard types. 
                        }

                        if (self.nodes_to_insert.get(node.name)) {
                            return;
                        }
                        var selector = `[type="ClassDeclaration"][id.name="${node.name}"]`;
                        if (esquery.query(self.ast, selector).length == 0) {
                            var node_from_source = esquery.query(source_tree, selector)
                            if (node_from_source.length > 0) {
                                self.nodes_to_insert.set(
                                    node.name, 
                                    {
                                        node: node_from_source[0], 
                                        source: source_tree
                                    }
                                );
                            }
                        }
                        return // do not replace `new SomeClass()` constructions.
                    }

                    if (/Function/.test(node.type)) { 
                        return // do not replace function declaration names.
                    }

                    // `someClass.method`. replace only someClass.
                    if (
                        node.type == "Identifier" &&
                        parent.type == "MemberExpression" && 
                        node == parent.property &&
                        !parent.computed
                     ) {
                        return // do not replace property calls.
                    }
                }

                switch (node.name) {
                    case 'console': return; // add standard modules here.
                    case "Math": return;
                }

                if (node.type == "Identifier") {
                    if (!self.var_exists(node.name)) {
                        node.name = self.rand_variable_name();
                    };
                }
            },
            leave: function (node, parent) {}
        });
        self.free_new_node_variables();
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
                    if (node.id) {
                        self.function_stack.push(node.id.name);
                    } else {
                        self.function_stack.push("anon_function");
                    }

                    self.prev_scope.push(new Map(self.function_variables));
                }

                if (self.in_function()) {
                    // skip function names -_0_0_-.
                    if (!/Function/.test(node.type)) {
                        self.extract_function_variables(self.scopeManager.getDeclaredVariables(node));
                    }
                } else {
                    self.extract_global_variables(self.scopeManager.getDeclaredVariables(node));
                }

                switch(node.type) {
                    case "DoWhileStatement":
                    case "ForStatement":
                    case "ForInStatement":
                    case "ForOfStatement":
                    case "WhileStatement": self.in_loop = true;
                    case "SwitchStatement": self.is_switch = true;
                    case  "WithStatement": break;
                    //case  "BlockStatement": break; // Нужен ли нам блок стейтмент?
                    default: return;
                }
                
                var [new_node, source_tree] = self.getNode(node.type);
                //var [new_node, source_tree] = self.getSpecifiedNode("./tests/insert_function_test.js", 0, node.type);

                self.prepare_node_for_insertion(new_node, source_tree);              
                self.is_need_refresh_scope_manager = true;
                return new_node;
            }, 
            leave: function (node, parent) {  
                // delete variables which are declarated in function node.
                if (/Function/.test(node.type)) {
                    self.free_function_variables();
                }

                switch(node.type) {
                    case "DoWhileStatement":
                    case "ForStatement":
                    case "ForInStatement":
                    case "ForOfStatement":
                    case "WhileStatement": self.in_loop = false; break;
                    case "SwitchStatement": self.is_switch = false; break;
                }
            },
        })

        // we do it in the end because we ara in a global context - it means that varriable arrays are empty.
        self.nodes_to_insert.forEach(function(value, key, map){
            self.prepare_node_for_insertion(value.node, value.source);
            self.ast.body.push(value.node);
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