import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { dbConnect, doesUserExist, passwordMatch } from "../utils/commonUtils.js";

export class UserService {
    db;
    salt;
    regEx;
    constructor() {
        dotenv.config()
        this.db = dbConnect();
        this.salt = Number(process.env.SALT);
        this.regEx = {
            email: /^([a-z\d\.-]+)@([a-z]+)\.([a-z]{2,8})(\.[a-z]{2,8})?$/,
            password: /^([\w\S]{14,24})/,
            name: /^([\w\s]{8,40})/i
        }
    }

    async createUser(email, password, name='') {
        try {
            // Basic email verification with regex
            if (!this.regEx.email.test(email)) {
                return { success: false, error: 'Invalid email format. Please provide a valid email address.' };
            }
            // Check if password meets requirements of between 14 and 24 characters with no spaces
            else if (!this.regEx.password.test(password)) {
                return { success: false, error: 'Password is invalid. Please make sure that password is between 14 and 24 characters with no white spaces' };
            }
            // Check if email is already being used
            else if (await doesUserExist(email, this.db) == true) {
                return { success: false, error: 'Email is already in use. Please use a different email' };
            }
            // Hash the password to store into database
            else {
                const hash = await bcrypt.hash(password, this.salt);
                await this.db.query(`INSERT INTO users (email, password, name, accountCreationDate)
                                    VALUES (?, ?, ?, NOW())`, [email, hash, name]);
                return { success: true, message: 'Account has been successfully created' };
            }
        } catch (err) {
            throw err;
        }
    }

    async userLogin(email, password) {
        try {
            // Check if email is already being used and if password matches
            if (await doesUserExist(email, this.db) != true || await passwordMatch(email, password, this.db) != true) {
                return { success: false, error: 'Unable to log in. Please make sure your email and password are correct' };
            }
            else {
                this.db.query(`UPDATE gameData SET lastLogin = NOW() WHERE email=?`, [email])
                return { success: true, error: 'User successfully logged in' };
            }
        }
        catch (err) {
            throw err;
        }   
    }

    async deleteUser(email, password) {
        try {
            // Check if email exists
            if (await doesUserExist(email, this.db) != true) {
                return { success: false, error: 'Account does not exist' }
            }
            // Check if password matches 
            else if (await passwordMatch(email, password, this.db) != true) {
                return { success: false, error: 'Unable to log in. Please make sure your email and password are correct' };
            }
            else {
                await this.db.query('DELETE FROM users WHERE email=?', [email]);
                return { success: true, message: 'Account successfully deleted' };
            }
        }
        catch (err) {
            console.log(err)
            throw err;
        }
    }

    async changePassword(email, password, newPassword) {
        try {
            // Check if new password is valid with regex
            if (!this.regEx.password.test(newPassword)) {
                return { success: false, error: 'Password is invalid. Please make sure that new password is between 14 and 24 characters with no spaces' };
            }
            // Check if user exists with query and check if password matches
            else if (await doesUserExist(email, this.db) != true || await passwordMatch(email, password, this.db) != true) {
                return { success: false, error: 'Unable to log in. Please make sure your email and password are correct' };
            }
            // Create new hash for new password if all requirements for password and users match
            else {
                const hash = await bcrypt.hash(newPassword, this.salt);
                await this.db.query(`UPDATE users SET password=? WHERE email=?`, [hash, email]);
                return { success: true, message: 'Password has been successfully changed'};
            }
        }
        catch (err) {
            throw err;
        }
    }

    async updateName(email, newName) {
        try {
            // Check if name is valid
            if (this.regEx.name.test(newName)) {
                return { success: false, error: 'Name is invalid, please use only numbers, letters, and underscores' };
            }
            // Check if user exists
            else if (await doesUserExist(email, this.db) != true) {
                return { success: false, error: 'Account does not exist' };
            }
            else {
                await this.db.query(`UPDATE users SET name=? WHERE email=?`, [newName, email]);
                return { success: true, message: 'Name has been changed' };
            }
        }
        catch (err) {
            throw err;
        }
    }

    async getName(email) {
        try {
            // Check if user exists
            if (await doesUserExist(email, this.db) != true) {
                return { success: false, error: 'Account does not exist' };
            }
            else {
                const nameQuery = await this.db.query(`Select name from users where email=?`, [email]);
                var name = nameQuery[0][0];
                // Prevent name from returning as undefined if does not exist
                if (!name) {
                    name = 'none';
                }
                return { success: true, message: 'Name has been grabbed', result: name};
            }
        }
        catch (err) {
            throw err;
        }
    }
}