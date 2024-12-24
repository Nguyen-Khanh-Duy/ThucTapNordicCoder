import { ChangePasswordAuthDto, CodeAuthDto, CreateAuthDto } from '@/auth/dto/create-auth.dto';
import { hashPasswordHelper } from '@/helpers/util';
import { MailerService } from '@nestjs-modules/mailer';
import { BadRequestException, Injectable } from '@nestjs/common'; // Import BadRequestException here
import { InjectModel } from '@nestjs/mongoose';
import aqp from 'api-query-params';
import mongoose, { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';
import dayjs = require('dayjs');
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) 
    private userModel: Model<User>,
    private readonly mailerService: MailerService
  ) {}

  IsEmailExist = async (email: string) => {
    const user = await this.userModel.exists({ email });
    return user ? true : false; // This can be simplified as a ternary operator
  };

  async create(createUserDto: CreateUserDto) {
    const { name, email, password, phone, address, image } = createUserDto;
    // check email
    const isExists = await this.IsEmailExist(email); // Make sure to await this
    if (isExists === true) {
      throw new BadRequestException(`Email đã tồn tại: ${email}. Vui lòng sử dụng email khác`);
    }
    // hash password
    const hashPassword = await hashPasswordHelper(createUserDto.password);
    const user = await this.userModel.create({
      name,
      email,
      password: hashPassword, // Store the hashed password here
      phone,
      address,
      image
    });
    return {
      _id: user._id
    };
  }

  async findAll(query: string, current: number, pageSize: number) {
    const {filter, sort}= aqp(query);
    if (filter.current) delete filter.current;
    if (filter.pageSize) delete filter.cpageSizet;

    if(!current) current =1;
    if(!pageSize) pageSize =10;

    const totalItems = (await this.userModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const skip= (+current - 1) * (+pageSize);
    const results = await this.userModel
    .find(filter)
    .limit(pageSize)
    .skip(skip)
    .select("-password")
    .sort(sort as any)

    return {results, totalPages};
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }
async findByEmail(email: string){
  return await this.userModel.findOne({email})
}

  async update( updateUserDto: UpdateUserDto) {
    return await this.userModel.updateOne(
      {_id: updateUserDto._id}, {...updateUserDto});
  }

  async remove(_id: string) {
    //check id
    if(mongoose.isValidObjectId(_id)) {
      //delete
      return this.userModel.deleteOne({_id})
    }else{
      throw new BadRequestException("Id không đúng")
    }
    
  }
  async handleRegister(registerDto: CreateAuthDto) {
    const { name, email, password } = registerDto;
  
    // Kiểm tra email
    const isExists = await this.IsEmailExist(email);
    if (isExists) {
      throw new BadRequestException(`Email đã tồn tại: ${email}. Vui lòng sử dụng email khác`);
    }
  
    // Hash password
    const hashPassword = await hashPasswordHelper(password);
  const codeId = uuidv4();
    // Tạo người dùng mới
    const user = await this.userModel.create({
      name,
      email,
      password: hashPassword,
      isActive: false,
      codeId: codeId,
      codeExpired: dayjs().add(5, 'minutes')
     // codeExpired: dayjs().add(30, 'seconds')
    })
    //send email
 this.mailerService.sendMail({
    to:user.email,   
    subject:'Activate your account at @NguyenKhanhDuy',
    template:"register",
    context:{
      name:user?.name ?? user.email,
      activationCode: codeId 
}
 })
    // Trả về phản hồi
    return {
      _id: user._id
    }
  }
  async handelActive(data: CodeAuthDto) {
    const user =await this.userModel.findOne({
      _id: data._id,
      codeId: data.code
    })
    if(!user){
      throw new BadRequestException('Mã code không hợp lệ !!')
    }
    //check expire code
    const isBeforeCheck = dayjs().isBefore(user.codeExpired)
    if (isBeforeCheck) {
      //valid => update uer
      await this.userModel.updateOne({ _id: data._id }, {
          isActive: true
      })
   return{isBeforeCheck};
      
   }else{
      throw new BadRequestException('Mã code đã hết hạn !!')
    }
    return { isBeforeCheck };
  }
  async retryActive(email: string) {
    //check-email
    const user = await this.userModel.findOne({ email })

    if(!user){
      throw new BadRequestException('Tài khoản không tồn tại')
    }
    if (user.isActive){
      throw new BadRequestException('Tài khoản đã được kích hoạt')
    }
    //send email
    const codeId = uuidv4();
    // update user
    await user.updateOne({
      codeId: codeId,
      codeExpired: dayjs().add(5, 'minutes')
    })
    //send email
    this.mailerService.sendMail({
      to: user.email,
      subject: 'Activate your account at @NguyenKhanhDuy',
      template: 'register',
      context:{
        name: user?.name ?? user.email,
        activationCode: codeId 
  }
   })
    return { _id: user._id }
  }
  async retryPassword(email: string) {
    //check-email
    const user = await this.userModel.findOne({ email })

    if(!user){
      throw new BadRequestException('Tài khoản không tồn tại')
    }
   
    //send email
    const codeId = uuidv4();
    // update user
    await user.updateOne({
      codeId: codeId,
      codeExpired: dayjs().add(5, 'minutes')
    })
    //send email
    this.mailerService.sendMail({
      to: user.email,
      subject: 'Change your password account at @NguyenKhanhDuy',
      template: 'register',
      context:{
        name: user?.name ?? user.email,
        activationCode: codeId 
  }
   })
    return { _id: user._id, email: user.email }
  }
  async changePassword(data: ChangePasswordAuthDto) {
    if (data.confirmPassword !== data.password) {
      throw new BadRequestException(
        'Mật khẩu và xác nhận mật khẩu không chính xác'
      );
    }
    //check-email
    const user = await this.userModel.findOne({ email: data.email })

    if (!user) {
      throw new BadRequestException('Tài khoản không tồn tại')
    }
  
    //check expire code
    const isBeforeCheck = dayjs().isBefore(user.codeExpired);
    if (isBeforeCheck) {
      //valid => update password
      const newPassword = await hashPasswordHelper(data.password);
      await user.updateOne({ password: newPassword });
      return { isBeforeCheck };
    }else{
      throw new BadRequestException('Mã code đã hết hạn !!');
     }
   
  }
}
