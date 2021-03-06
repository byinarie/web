﻿angular
    .module('bit.vault')

    .controller('vaultController', function ($scope, $uibModal, apiService, $filter, cryptoService, authService, toastr, cipherService) {
        $scope.logins = [];
        $scope.folders = [];

        $scope.loadingLogins = true;
        apiService.logins.list({}, function (logins) {
            $scope.loadingLogins = false;

            var decLogins = [];
            for (var i = 0; i < logins.Data.length; i++) {
                var decLogin = {
                    id: logins.Data[i].Id,
                    folderId: logins.Data[i].FolderId,
                    favorite: logins.Data[i].Favorite
                };

                try { decLogin.name = cryptoService.decrypt(logins.Data[i].Name); }
                catch (err) { decLogin.name = '[error: cannot decrypt]'; }

                if (logins.Data[i].Username) {
                    try { decLogin.username = cryptoService.decrypt(logins.Data[i].Username); }
                    catch (err) { decLogin.username = '[error: cannot decrypt]'; }
                }

                decLogins.push(decLogin);
            }

            $scope.logins = decLogins;
        }, function () {
            $scope.loadingLogins = false;
        });

        $scope.loadingFolders = true;
        apiService.folders.list({}, function (folders) {
            $scope.loadingFolders = false;

            var decFolders = [{
                id: null,
                name: '(none)'
            }];

            for (var i = 0; i < folders.Data.length; i++) {
                var decFolder = {
                    id: folders.Data[i].Id
                };

                try { decFolder.name = cryptoService.decrypt(folders.Data[i].Name); }
                catch (err) { decFolder.name = '[error: cannot decrypt]'; }

                decFolders.push(decFolder);
            }

            $scope.folders = decFolders;
        }, function () {
            $scope.loadingFolders = false;
        });

        $scope.folderSort = function (item) {
            if (!item.id) {
                return '';
            }

            return item.name.toLowerCase();
        };

        $scope.editLogin = function (login) {
            var editModel = $uibModal.open({
                animation: true,
                templateUrl: 'app/vault/views/vaultEditLogin.html',
                controller: 'vaultEditLoginController',
                resolve: {
                    loginId: function () { return login.id; },
                    folders: function () { return $scope.folders; }
                }
            });

            editModel.result.then(function (returnVal) {
                if (returnVal.action === 'edit') {
                    var loginToUpdate = $filter('filter')($scope.logins, { id: returnVal.data.id }, true);

                    if (loginToUpdate && loginToUpdate.length > 0) {
                        loginToUpdate[0].folderId = returnVal.data.folderId;
                        loginToUpdate[0].name = returnVal.data.name;
                        loginToUpdate[0].username = returnVal.data.username;
                        loginToUpdate[0].favorite = returnVal.data.favorite;
                    }
                }
                else if (returnVal.action === 'delete') {
                    var loginToDelete = $filter('filter')($scope.logins, { id: returnVal.data }, true);
                    if (loginToDelete && loginToDelete.length > 0) {
                        var index = $scope.logins.indexOf(loginToDelete[0]);
                        if (index > -1) {
                            $scope.logins.splice(index, 1);
                        }
                    }
                }
            });
        };

        $scope.$on('vaultAddLogin', function (event, args) {
            $scope.addLogin();
        });

        $scope.addLogin = function (folder) {
            var addModel = $uibModal.open({
                animation: true,
                templateUrl: 'app/vault/views/vaultAddLogin.html',
                controller: 'vaultAddLoginController',
                resolve: {
                    folders: function () { return $scope.folders; },
                    selectedFolder: function () { return folder; }
                }
            });

            addModel.result.then(function (addedLogin) {
                $scope.logins.push(addedLogin);
            });
        };

        $scope.deleteLogin = function (login) {
            if (!confirm('Are you sure you want to delete this login (' + login.name + ')?')) {
                return;
            }

            apiService.logins.del({ id: login.id }, function () {
                var index = $scope.logins.indexOf(login);
                if (index > -1) {
                    $scope.logins.splice(index, 1);
                }
            });
        };

        $scope.editFolder = function (folder) {
            var editModel = $uibModal.open({
                animation: true,
                templateUrl: 'app/vault/views/vaultEditFolder.html',
                controller: 'vaultEditFolderController',
                size: 'sm',
                resolve: {
                    folderId: function () { return folder.id; }
                }
            });

            editModel.result.then(function (editedFolder) {
                var folder = $filter('filter')($scope.folders, { id: editedFolder.id }, true);
                if (folder && folder.length > 0) {
                    folder[0].name = editedFolder.name;
                }
            });
        };

        $scope.$on('vaultAddFolder', function (event, args) {
            $scope.addFolder();
        });

        $scope.addFolder = function () {
            var addModel = $uibModal.open({
                animation: true,
                templateUrl: 'app/vault/views/vaultAddFolder.html',
                controller: 'vaultAddFolderController',
                size: 'sm'
            });

            addModel.result.then(function (addedFolder) {
                $scope.folders.push(addedFolder);
            });
        };

        $scope.deleteFolder = function (folder) {
            if (!confirm('Are you sure you want to delete this folder (' + folder.name + ')?')) {
                return;
            }

            apiService.folders.del({ id: folder.id }, function () {
                var index = $scope.folders.indexOf(folder);
                if (index > -1) {
                    $scope.folders.splice(index, 1);
                }
            });
        };

        $scope.canDeleteFolder = function (folder) {
            if (!folder || !folder.id) {
                return false;
            }

            var logins = $filter('filter')($scope.logins, { folderId: folder.id });
            return logins.length === 0;
        };
    });
