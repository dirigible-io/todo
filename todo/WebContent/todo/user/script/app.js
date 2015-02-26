
function TodoController($scope, $http){
    var todoUrl = "/dirigible/js-secured/todo/user/todo.js";
    
    $scope.status = [];
    $scope.columns = [
        {
            name: 'todo',
            display: 'Todo'
        }, 
        {
            name: 'priority',
            display: 'Priority'
        },
        {
            name: 'status',
            display: 'Status'
        },
        {
            user: 'userInfo'
        }
    ];
    
    refreshData();
    
    function refreshData(){
        $http.get(todoUrl)
            .success(function(data){
                $scope.items = data;
                for(var i = 0; i < data.length ; i ++){
                    if(data[i].userInfo){
                        $scope.userInfo = data[i].userInfo;
                        $scope.status.push(data[i].status);
                    }
                }
            })
            .error(function(data){
                
            });
    }
    
    $scope.done = function(team){
        var todo = {};
        todo.id = team.id;
        
        $http.post(votesUrl, vote)
            .success(function(){
                refreshData();
            })
            .error(function(response){
                
            });
    }
      
}
