var systemLib = require('system');
var ioLib = require('io');

// get method type
var method = request.getMethod();
method = method.toUpperCase();

//get primary keys (one primary key is supported!)
var idParameter = getPrimaryKey();

// retrieve the id as parameter if exist 
var id = xss.escapeSql(request.getParameter(idParameter));
var count = xss.escapeSql(request.getParameter('count'));
var metadata = xss.escapeSql(request.getParameter('metadata'));
var sort = xss.escapeSql(request.getParameter('sort'));
var limit = xss.escapeSql(request.getParameter('limit'));
var offset = xss.escapeSql(request.getParameter('offset'));
var desc = xss.escapeSql(request.getParameter('desc'));
var userInfoParam = xss.escapeSql(request.getParameter('userInfoParam'));

if (limit === null) {
	limit = 100;
}
if (offset === null) {
	offset = 0;
}

if(!hasConflictingParameters()){
    // switch based on method type
    if ((method === 'POST')) {
        // create
        createT_todo();
    } else if ((method === 'GET')) {
        // read
        if (id) {
            readT_todoEntity(id);
        } else if (count !== null) {
            countT_todo();
        } else if (metadata !== null) {
            metadataT_todo();
        } else if(userInfoParam !== null){
             getUserInfo();
        } else {
            readT_todoList();
        }
    } else if ((method === 'PUT')) {
        // update
        updateT_todo();    
        
    } else if ((method === 'DELETE')) {
        // delete
            deleteT_todo(id);
        
    } else {
        makeError(javax.servlet.http.HttpServletResponse.SC_BAD_REQUEST, 1, "Invalid HTTP Method");
    }    
}



// flush and close the response
response.getWriter().flush();
response.getWriter().close();

function hasConflictingParameters(){
    if(id !== null && count !== null){
        makeError(javax.servlet.http.HttpServletResponse.SC_EXPECTATION_FAILED, 1, "Precondition failed: conflicting parameters - id, count");
        return true;
    }
    if(id !== null && metadata !== null){
        makeError(javax.servlet.http.HttpServletResponse.SC_EXPECTATION_FAILED, 1, "Precondition failed: conflicting parameters - id, metadata");
        return true;
    }
    return false;
}

function isInputParameterValid(paramName){
    var param = request.getParameter(paramName);
    if(param === null || param === undefined){
        makeError(javax.servlet.http.HttpServletResponse.SC_PRECONDITION_FAILED, 1, "Expected parameter is missing: " + paramName);
        return false;
    }
    return true;
}

// print error
function makeError(httpCode, errCode, errMessage) {
    var body = {'err': {'code': errCode, 'message': errMessage}};
    response.setStatus(httpCode);
    response.setHeader("Content-Type", "application/json");
    response.getWriter().print(JSON.stringify(body));
}

// create entity by parsing JSON object from request body
function createT_todo() {
    var input = ioLib.read(request.getReader());
    var message = JSON.parse(input);
    var connection = datasource.getConnection();
    try {
        var sql = "INSERT INTO TODO (";
        sql += "ID";
        sql += ",";
        sql += "TODO_USER";
        sql += ",";
        sql += "TODO";
        sql += ",";
        sql += "PRIORITY";
        sql += ",";
        sql += "STATUS";
        sql += ") VALUES ("; 
        sql += "?";
        sql += ",";
        sql += "?";
        sql += ",";
        sql += "?";
        sql += ",";
        sql += "?";
        sql += ",";
        sql += "?";
        sql += ")";

        var statement = connection.prepareStatement(sql);
        var i = 0;
        var id = db.getNext('TODO_ID');
        statement.setInt(++i, id);
        statement.setString(++i, user);
        statement.setString(++i, message.todo);
        //TODO select priority from ui
        statement.setString(++i, message.priority);
        statement.setInt(++i, 0);
        statement.executeUpdate();
        response.getWriter().println(id);
    } catch(e){
        var errorCode = javax.servlet.http.HttpServletResponse.SC_BAD_REQUEST;
        makeError(errorCode, errorCode, e.message);
    } finally {
        connection.close();
    }
}

// read single entity by id and print as JSON object to response
function readT_todoEntity(id) {
    var connection = datasource.getConnection();
    try {
        var result = "";
        var sql = "SELECT * FROM TODO WHERE "+pkToSQL();
        var statement = connection.prepareStatement(sql);
        statement.setString(1, id);
        
        var resultSet = statement.executeQuery();
        var value;
        while (resultSet.next()) {
            result = createEntity(resultSet);
        }
        if(result.length === 0){
            makeError(javax.servlet.http.HttpServletResponse.SC_NOT_FOUND, 1, "Record with id: " + id + " does not exist.");
        }
        var text = JSON.stringify(result, null, 2);
        response.getWriter().println(text);
    } catch(e){
        var errorCode = javax.servlet.http.HttpServletResponse.SC_BAD_REQUEST;
        makeError(errorCode, errorCode, e.message);
    } finally {
        connection.close();
    }
}

// read all entities and print them as JSON array to response
function readT_todoList() {
    var connection = datasource.getConnection();
    try {
        var result = [];
        var sql = "SELECT * FROM TODO WHERE TODO_USER = ?";
        
        if (limit !== null && offset !== null) {
            sql += " " + db.createTopAndStart(limit, offset);
        }
        if (sort !== null) {
            sql += " ORDER BY " + sort;
        }
        if (sort !== null && desc !== null) {
            sql += " DESC ";
        }
        if (limit !== null && offset !== null) {
            sql += " " + db.createLimitAndOffset(limit, offset);
        }
        
        var statement = connection.prepareStatement(sql);
        statement.setString(1, user);
        var resultSet = statement.executeQuery();
        var value;
        while (resultSet.next()) {
            result.push(createEntity(resultSet));
        }
        response.setHeader('Content-Type', 'application/json');
        var text = JSON.stringify(result, null, 2);
        response.getWriter().println(text);
    } catch(e){
        var errorCode = javax.servlet.http.HttpServletResponse.SC_BAD_REQUEST;
        makeError(errorCode, errorCode, e.message);
    } finally {
        connection.close();
    }
}

function getUserInfo(){
    var result = [];
    
    var jsonUser = {};
        jsonUser.loggedInUser = user;
        result.push(jsonUser);
        response.setHeader('Content-Type', 'application/json');
    var text = JSON.stringify(result, null, 2);
        response.getWriter().println(text);
}

//create entity as JSON object from ResultSet current Row
function createEntity(resultSet, data) {
    var result = {};
	result.id = resultSet.getInt("ID");
    result.user = resultSet.getString("TODO_USER");
    result.todo = resultSet.getString("TODO");
    result.priority = resultSet.getString("PRIORITY");
    result.status = resultSet.getInt("STATUS") == 1;
        
    return result;
}

// update entity by id
function updateT_todo() {
    var input = ioLib.read(request.getReader());
    var message = JSON.parse(input);
    var connection = datasource.getConnection();
    try {
        var i = 0;
        
        var sql = "UPDATE TODO SET ";
        sql += "STATUS = ?";
        sql += " WHERE ID = ?";
        
        var id = "";
        var statement = connection.prepareStatement(sql);
        
        statement.setInt(++i, message.status);
        id     = message.id;
        statement.setInt(++i, id);
        statement.executeUpdate();
        response.getWriter().println(id);
    } catch(e){
        var errorCode = javax.servlet.http.HttpServletResponse.SC_BAD_REQUEST;
        makeError(errorCode, errorCode, e.message);
    } finally {
        connection.close();
    }
}

// delete entity
function deleteT_todo() {
    var connection = datasource.getConnection();
    try {
        var sql = "DELETE FROM TODO WHERE STATUS = 1";
        var statement = connection.prepareStatement(sql);
        var resultSet = statement.executeUpdate();
    } catch(e){
        var errorCode = javax.servlet.http.HttpServletResponse.SC_BAD_REQUEST;
        makeError(errorCode, errorCode, e.message);
    } finally {
        connection.close();
    }
}

function countT_todo() {
    var count = 0;
    var connection = datasource.getConnection();
    try {
        var statement = connection.createStatement();
        var rs = statement.executeQuery('SELECT COUNT(*) FROM TODO');
        while (rs.next()) {
            count = rs.getInt(1);
        }
    } catch(e){
        var errorCode = javax.servlet.http.HttpServletResponse.SC_BAD_REQUEST;
        makeError(errorCode, errorCode, e.message);
    } finally {
        connection.close();
    }
    response.getWriter().println(count);
}

function metadataT_todo() {
	var entityMetadata = {};
	entityMetadata.name = 'todo';
	entityMetadata.type = 'object';
	entityMetadata.properties = [];
	
	var propertyid = {};
	propertyid.name = 'id';
	propertyid.type = 'integer';
	propertyid.key = 'true';
	propertyid.required = 'true';
    entityMetadata.properties.push(propertyid);

	var propertyuser = {};
	propertyuser.name = 'todo_user';
    propertyuser.type = 'string';
    entityMetadata.properties.push(propertyuser);

	var propertytodo = {};
	propertytodo.name = 'todo';
    propertytodo.type = 'string';
    entityMetadata.properties.push(propertytodo);

	var propertypriority = {};
	propertypriority.name = 'priority';
    propertypriority.type = 'string';
    entityMetadata.properties.push(propertypriority);

	var propertystatus = {};
	propertystatus.name = 'status';
	propertystatus.type = 'integer';
    entityMetadata.properties.push(propertystatus);


    response.getWriter().println(JSON.stringify(entityMetadata));
}

function getPrimaryKeys(){
    var result = [];
    var i = 0;
    result[i++] = 'ID';
    if (result === 0) {
        throw new Exception("There is no primary key");
    } else if(result.length > 1) {
        throw new Exception("More than one Primary Key is not supported.");
    }
    return result;
}

function getPrimaryKey(){
	return getPrimaryKeys()[0].toLowerCase();
}

function pkToSQL(){
    var pks = getPrimaryKeys();
    return pks[0] + " = ?";
}
