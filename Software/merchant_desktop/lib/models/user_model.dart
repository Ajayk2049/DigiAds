class UserModel {
  final String id;
  final String name;
  final String phone;
  final String email;
  final String role;
  final List<String> roles;

  UserModel({
    required this.id,
    required this.name,
    required this.phone,
    required this.email,
    required this.role,
    required this.roles,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'merchant',
      roles: (json['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? ['merchant'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'phone': phone,
      'email': email,
      'role': role,
      'roles': roles,
    };
  }
}
