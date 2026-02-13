FROM mysql:8.0

# Environment variables - Render will override these
ENV MYSQL_DATABASE=easyride_sacco
ENV MYSQL_USER=easyride_user
ENV MYSQL_PASSWORD=password
ENV MYSQL_ROOT_PASSWORD=rootpassword

# Expose MySQL port
EXPOSE 3306

# MySQL data directory
VOLUME ["/var/lib/mysql"]