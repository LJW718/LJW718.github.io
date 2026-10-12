---
layout: post
title:  Linux常用shell命令汇总
date:   2019-07-12 00:08:00 +0800
categories: Linux
tag: Linux常用shell命令
---

* content
{:toc}

参考整理自：[cnblogs 原文](https://www.cnblogs.com/yjd_hycf_space/p/7730690.html)，并按现代 Linux（Ubuntu / Debian / CentOS / RHEL）使用习惯做了精简、纠错与举例补充。

> 约定：示例中的路径、用户名、IP 请按实际环境替换。带 `sudo` 的命令通常需要管理员权限。

## 1、系统信息

```bash
uname -a                 # 查看内核与系统概要
uname -r                 # 内核版本，如 5.15.0-91-generic
uname -m                 # CPU 架构：x86_64 / aarch64
arch                     # 同上，显示处理器架构

hostnamectl              # 主机名、操作系统、内核（systemd 系统）
cat /etc/os-release      # 发行版信息
cat /proc/cpuinfo        # CPU 详情
lscpu                    # CPU 信息（更易读）
cat /proc/meminfo        # 内存详情
free -h                  # 内存使用概况
cat /proc/swaps          # 当前 swap
swapon --show            # 同上，更直观

lspci -tv                # PCI 设备树
lsusb -tv                # USB 设备树
lsblk -f                 # 块设备与文件系统
dmidecode -t system      # 主板/厂商等 SMBIOS 信息（需 root）

date                     # 当前时间
timedatectl              # 时区与 NTP 状态
cal                      # 当月日历
cal 2026                 # 指定年份日历
```

举例：查看本机是不是 64 位、内核多少：

```bash
uname -m && uname -r
# x86_64
# 5.15.0-91-generic
```

## 2、关机、重启、注销

```bash
sudo shutdown -h now           # 立即关机
sudo shutdown -h +10           # 10 分钟后关机
sudo shutdown -h 23:30         # 定时关机
sudo shutdown -c               # 取消定时关机
sudo shutdown -r now           # 立即重启
sudo reboot                    # 重启
sudo poweroff                  # 关机
logout                         # 退出当前登录 shell
exit                           # 同上
```

举例：晚上 11 点维护，先预约重启再取消：

```bash
sudo shutdown -r 23:00
sudo shutdown -c
```

## 3、文件与目录

```bash
pwd                            # 当前路径
cd /home                       # 进入目录
cd ..                          # 上一级
cd ../..                       # 上两级
cd                             # 回到当前用户家目录（~）
cd ~alice                      # 进入 alice 家目录
cd -                           # 回到上次目录

ls                             # 列出文件
ls -lah                        # 含隐藏文件、人类可读大小
ls -lSr                        # 按大小排序
tree -L 2                      # 树形展示两层（需安装 tree）

mkdir dir1                     # 创建目录
mkdir -p /tmp/a/b/c            # 递归创建目录树
mkdir dir1 dir2                # 一次创建多个

touch file1.txt                # 创建空文件 / 更新时间戳
cp file1.txt file2.txt         # 复制文件
cp -a src_dir/ dest_dir/       # 复制目录（保留属性）
mv old.txt new.txt             # 重命名 / 移动
rm file1.txt                   # 删除文件
rm -rf dir1                    # 删除目录及其内容（危险）
rmdir empty_dir                # 删除空目录

ln -s /etc/nginx/nginx.conf ~/nginx.conf   # 软链接
ln file1.txt file1.hard                    # 硬链接
file file1.txt                 # 判断文件类型
```

举例：备份配置并做软链：

```bash
sudo cp /etc/hosts /etc/hosts.bak
ln -s /var/www/html ~/site
ls -l ~/site
```

## 4、文件搜索

```bash
find /home -name "*.log"                 # 按名字查找
find /var/log -type f -mtime -3          # 3 天内修改过的文件
find /tmp -type f -atime +30             # 30 天未访问
find /home -user alice                   # 属主为 alice
find /etc -name "*.conf" -exec ls -l {} \;
find / -xdev -name "*.rpm" 2>/dev/null   # 不跨文件系统

locate nginx.conf              # 快速查找（需 updatedb）
sudo updatedb                  # 更新 locate 数据库
which python3                  # 可执行文件路径
whereis nginx                  # 二进制 / 配置 / man 页位置
type cd                        # 判断命令是内置还是外部程序
```

举例：清理 7 天前的临时日志（先 dry-run 再删）：

```bash
find /var/log/myapp -name "*.log" -mtime +7 -print
# 确认无误后再执行：
# find /var/log/myapp -name "*.log" -mtime +7 -delete
```

## 5、磁盘与挂载

### 查看空间

```bash
df -h                          # 分区使用情况
df -i                          # inode 使用情况
du -sh *                       # 当前目录各项占用
du -sh /var/log                # 指定目录占用
du -h --max-depth=1 /home | sort -h
lsblk                          # 块设备树
```

### 挂载 / 卸载

```bash
sudo mkdir -p /mnt/data
sudo mount /dev/sdb1 /mnt/data
sudo mount -o loop image.iso /mnt/iso
sudo umount /mnt/data
sudo umount -l /mnt/data       # 繁忙时延迟卸载

# 写入 /etc/fstab 实现开机自动挂载（示例）
# UUID=xxxx-xxxx  /mnt/data  ext4  defaults  0  2
```

举例：查看哪个目录最占空间：

```bash
sudo du -h --max-depth=1 /var | sort -h | tail -n 10
```

## 6、用户与用户组

```bash
sudo groupadd devs
sudo groupmod -n developers devs
sudo groupdel developers

sudo useradd -m -s /bin/bash alice
sudo passwd alice
sudo usermod -aG sudo alice          # 追加到 sudo 组
sudo usermod -c "Alice Zhang" alice  # 修改注释
sudo userdel -r alice                # 删除用户及家目录

id alice
groups alice
chage -l alice                       # 查看密码过期策略
sudo pwck                            # 检查 passwd 文件
```

举例：新建开发账号并加入 docker 组：

```bash
sudo useradd -m -s /bin/bash dev
sudo passwd dev
sudo usermod -aG docker dev
id dev
```

## 7、权限与属主

```bash
ls -lh file.txt
chmod u+x script.sh                 # 所有者可执行
chmod 755 script.sh                 # rwxr-xr-x
chmod -R u=rwX,go=rX project/       # 目录可进、文件按原可执行位
chown alice file.txt
chown -R alice:devs project/
chgrp devs file.txt

# 特殊位（慎用）
chmod u+s /usr/local/bin/tool       # SUID
chmod g+s /shared                   # SGID（目录下新建文件继承组）
chmod +t /shared                    # sticky：仅所有者可删自己的文件
```

举例：部署脚本给执行权限：

```bash
chmod 750 deploy.sh
chown root:ops deploy.sh
ls -l deploy.sh
```

### 文件特殊属性（ext 文件系统）

```bash
sudo chattr +i important.conf       # 不可改、不可删
sudo chattr -i important.conf
sudo chattr +a app.log              # 只允许追加
lsattr important.conf app.log
```

## 8、打包与压缩

```bash
# tar + gzip / bzip2 / xz
tar -czvf backup.tar.gz dir1
tar -xzvf backup.tar.gz
tar -xzvf backup.tar.gz -C /tmp/out
tar -cjvf backup.tar.bz2 dir1
tar -xjvf backup.tar.bz2
tar -cJvf backup.tar.xz dir1
tar -tJvf backup.tar.xz             # 只查看内容

gzip file.log
gunzip file.log.gz
zip -r project.zip project/
unzip project.zip -d /tmp/project
```

举例：打包日志并排除临时文件：

```bash
tar -czvf logs-$(date +%F).tar.gz \
  --exclude='*.tmp' \
  /var/log/myapp
```

## 9、软件包管理

### Debian / Ubuntu（apt）

```bash
sudo apt update
sudo apt install nginx
sudo apt remove nginx
sudo apt purge nginx                # 连配置一起删
sudo apt upgrade
apt search nginx
apt show nginx
dpkg -l | grep nginx
dpkg -L nginx                       # 包安装了哪些文件
```

### RHEL / CentOS / Fedora（dnf / yum）

```bash
sudo dnf install nginx              # 新系统优先 dnf
sudo yum install nginx              # 旧系统
sudo dnf update nginx
sudo dnf remove nginx
dnf search nginx
dnf list installed | grep nginx
rpm -qa | grep nginx
rpm -ql nginx
```

举例：安装并确认版本：

```bash
sudo apt update && sudo apt install -y curl
curl --version
```

## 10、查看与处理文本

### 查看文件

```bash
cat file.txt
tac file.txt                        # 倒序输出
less file.txt                       # 可上下翻页（推荐）
more file.txt
head -n 20 file.txt
tail -n 20 file.txt
tail -f /var/log/syslog             # 实时跟踪日志
```

### grep / sed / awk / sort

```bash
grep "error" app.log
grep -i "error" app.log             # 忽略大小写
grep -R "TODO" ./src
grep -n "^ERROR" app.log

sed -n '1,20p' file.txt             # 打印 1~20 行
sed -i 's/foo/bar/g' file.txt       # 全局替换（建议先备份）
sed '/^$/d' file.txt                # 删除空行

echo "a b c" | awk '{print $1,$3}'
awk -F: '{print $1}' /etc/passwd

sort file.txt
sort file.txt | uniq
sort file.txt | uniq -c | sort -nr  # 统计频次
wc -l file.txt                      # 行数
```

举例：从 Nginx 访问日志统计状态码：

```bash
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -nr
```

### 编码与换行

```bash
file -i file.txt                    # 查看编码
iconv -f GBK -t UTF-8 gb.txt > utf8.txt
dos2unix file.txt                   # CRLF -> LF（需安装）
unix2dos file.txt
```

## 11、进程、服务与日志（systemd）

```bash
ps aux | grep nginx
top                                 # 交互式监控
htop                                # 更友好（需安装）
kill PID
kill -9 PID                         # 强制结束（慎用）
pkill -f "python app.py"

sudo systemctl status nginx
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl enable nginx         # 开机自启
sudo systemctl disable nginx

journalctl -u nginx -f              # 跟踪某服务日志
journalctl --since "1 hour ago"
dmesg -T | tail                     # 内核环缓冲
```

举例：重启服务并看最近错误：

```bash
sudo systemctl restart nginx
journalctl -u nginx -n 50 --no-pager
```

## 12、网络

现代发行版优先用 `ip` / `ss`，`ifconfig` / `netstat` 多已过时。

```bash
ip a                                # 网卡与 IP
ip link show
ip route                            # 路由表
ip r add default via 192.168.1.1

# 旧命令（部分系统仍可用）
ifconfig
route -n

ss -tulnp                           # 监听端口（替代 netstat）
ss -antp                            # 当前连接
curl -I https://example.com
wget https://example.com/file.tgz
ping -c 4 8.8.8.8
traceroute example.com              # 或 tracepath
dig example.com +short
nslookup example.com
hostname -f
```

举例：查谁占用了 80 端口：

```bash
sudo ss -tulnp | grep ':80'
# 或
sudo lsof -i :80
```

## 13、备份与同步

```bash
# rsync：增量同步（强烈推荐）
rsync -avh --progress /data/ /backup/data/
rsync -avhz -e ssh /data/ user@192.168.1.10:/backup/data/
rsync -avh --delete /data/ /backup/data/     # 让目标与源一致（慎用）

# dd：磁盘/镜像级拷贝（极危险，确认 if/of）
sudo dd if=/dev/sda of=/backup/sda.img bs=4M status=progress
```

举例：通过 SSH 同步网站目录：

```bash
rsync -avhz -e ssh --exclude '.git' \
  /var/www/html/ user@backup-server:/data/html/
```

## 14、文件系统检查与格式化（高风险）

> 下列命令可能造成数据丢失，执行前务必确认设备名（`lsblk` / `fdisk -l`）。

```bash
sudo lsblk
sudo mkfs.ext4 /dev/sdb1            # 格式化为 ext4
sudo mkfs.xfs /dev/sdb1
sudo mkswap /dev/sdb2
sudo swapon /dev/sdb2

sudo fsck /dev/sdb1                 # 检查修复（分区需先卸载）
sudo badblocks -v /dev/sdb          # 坏道检测（耗时）
```

## 15、实用组合示例

### 快速排查磁盘打满

```bash
df -h
sudo du -h --max-depth=1 / | sort -h | tail -n 20
sudo journalctl --disk-usage
```

### 后台运行并记日志

```bash
nohup python3 app.py > app.out 2>&1 &
tail -f app.out
```

### 批量替换文本

```bash
grep -RIl "old_api" ./src | xargs sed -i 's/old_api/new_api/g'
```

### 查看本机对外网卡 IP

```bash
ip -4 route get 1.1.1.1 | awk '{print $7; exit}'
```

---

常用思路可以记成四句：

1. **看状态**：`ps` / `ss` / `df` / `free` / `systemctl status`
2. **找问题**：`journalctl` / `tail -f` / `grep` / `dmesg`
3. **改配置**：改完后 `systemctl restart`，必要时先备份
4. **传数据**：小文件用 `scp`，目录同步优先 `rsync`
