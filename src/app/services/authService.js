angular
    .module('bit.services')

    .factory('authService', function (cryptoService, apiService, tokenService, $q, jwtHelper) {
        var _service = {},
            _userProfile = null;

        _service.logIn = function (email, masterPassword, token, provider) {
            email = email.toLowerCase();
            var key = cryptoService.makeKey(masterPassword, email);

            var request = {
                username: email,
                password: cryptoService.hashPassword(masterPassword, key),
                grant_type: 'password',
                scope: 'api offline_access',
                client_id: 'web'
            };

            if (token && typeof (provider) !== 'undefined' && provider !== null) {
                request.twoFactorToken = token.replace(' ', '');
                request.twoFactorProvider = provider;
            }

            // TODO: device information one day?

            var deferred = $q.defer();
            apiService.identity.token(request, function (response) {
                if (!response || !response.access_token) {
                    return;
                }

                tokenService.setToken(response.access_token);
                tokenService.setRefreshToken(response.refresh_token);
                cryptoService.setKey(key);
                deferred.resolve();
            }, function (error) {
                if (error.status === 400 && error.data.TwoFactorProviders && error.data.TwoFactorProviders.length) {
                    deferred.resolve(error.data.TwoFactorProviders);
                }
                else {
                    deferred.reject(error);
                }
            });

            return deferred.promise;
        };

        _service.logOut = function () {
            tokenService.clearToken();
            tokenService.clearRefreshToken();
            cryptoService.clearKey();
            _userProfile = null;
        };

        _service.getUserProfile = function () {
            if (!_userProfile) {
                _service.setUserProfile();
            }

            return _userProfile;
        };

        _service.setUserProfile = function () {
            var token = tokenService.getToken();
            if (!token) {
                return;
            }

            var decodedToken = jwtHelper.decodeToken(token);

            _userProfile = {
                id: decodedToken.name,
                email: decodedToken.email
            };

            apiService.accounts.getProfile({}, loadProfile);
        };

        function loadProfile(profile) {
            _userProfile.extended = {
                name: profile.Name,
                twoFactorEnabled: profile.TwoFactorEnabled,
                culture: profile.Culture
            };
        }

        _service.isAuthenticated = function () {
            return tokenService.getToken() !== null;
        };

        return _service;
    });
